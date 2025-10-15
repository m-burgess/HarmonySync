import React, { useState, useEffect, useRef } from 'react';
import * as Tauri from '@tauri-apps/api';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriCore from '@tauri-apps/api/core';
import { 
  MusicalNoteIcon, 
  PresentationChartBarIcon, 
  CogIcon,
  SpeakerWaveIcon,
  ClipboardDocumentListIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

import './styles/App.css';
import './styles/vscode-theme.css';
import { 
  ActivityBarIcon, 
  VSCodeStatusBar 
} from './components/VSCodeUI.jsx';
import SetlistManager from './SetlistManager.jsx';
import SlideManager from './SlideManager.jsx';
import MultitrackPlayer from './MultitrackPlayer.jsx';
import DisplaySettings from './DisplaySettings.jsx';


import { parseLyricsToSlides } from './utils/lyrics';
import { loadAudioFile, getAudioContext, getTracks, applyDefaultPanning } from './utils/audio';


// This function lets the user select a folder and then calls the backend to import it.
async function handleImportSong() {
  try {
    // Open a dialog for the user to select a directory.
    const selectedPath = await TauriDialog.open({
      directory: true,
      multiple: false,
      title: 'Select Song Folder',
    });

    if (typeof selectedPath === 'string') {
      // If a folder was selected, call the import command.
      console.log(`Importing song from: ${selectedPath}`);
      await TauriCore.invoke('import_song_folder', {
        folderPath: selectedPath,
      });
      alert('Song imported successfully!');
    } else {
      // The user cancelled the dialog.
      console.log('Folder selection cancelled.');
    }
  } catch (error) {
    console.error('Failed to import song:', error);
    alert(`Error: ${error}`);
  }
}

async function handleImportPresentation() {
    try {
        const selectedPath = await TauriDialog.open({
            directory: true,
            multiple: false,
            title: 'Select Presentation Folder',
        });

        if (typeof selectedPath === 'string') {
            console.log(`Importing presentation from: ${selectedPath}`);
            await TauriCore.invoke('import_presentation_folder', {
                sourceFolderPath: selectedPath,
                category: 'presentation',
            });
            alert('Presentation imported successfully!');
        } else {
            console.log('Folder selection cancelled.');
        }
    } catch (error) {
        console.error('Failed to import presentation:', error);
        alert(`Error: ${error}`);
    }
}

const App = () => {
  const [allSlides, setAllSlides] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [serviceOrder, setServiceOrder] = useState([]); // New state for service order
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const containerRef = useRef(null);

  // Resizable layout: Service Order sidebar and Multitrack panel
  const DEFAULT_SIDEBAR_WIDTH = 300;
  const DEFAULT_MULTITRACK_HEIGHT = 200;
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const v = parseInt(localStorage.getItem('rp_sidebarWidth'), 10);
    return isNaN(v) ? DEFAULT_SIDEBAR_WIDTH : v;
  });
  
  const [multitrackHeight, setMultitrackHeight] = useState(() => {
    const v = parseInt(localStorage.getItem('rp_multitrackHeight'), 10);
    return isNaN(v) ? DEFAULT_MULTITRACK_HEIGHT : v;
  });
  const draggingRef = useRef(null);
  const rafRef = useRef(null);

  // Add imported songs/presentations directly to service order
  const addToServiceOrder = (item) => {
    setServiceOrder(prevOrder => [...prevOrder, {
      type: item.type,
      id: item.id || Date.now(),
      name: item.name,
      loaded: false,
      slides: item.slides || [],
      tracks: item.tracks || []
    }]);
  };

  const handleAddSongToSetlist = async (songId, songTitle) => {
    setServiceOrder(prevOrder => [...prevOrder, { type: 'song', id: songId, name: songTitle, loaded: false, slides: [], tracks: [] }]);
  };

  const handleAddPresentationToSetlist = async (presentationId, presentationName) => {
    setServiceOrder(prevOrder => [...prevOrder, { type: 'presentation', id: presentationId, name: presentationName, loaded: false, slides: [], tracks: [] }]);
  };

  useEffect(() => {
    console.log('[App] allTracks state updated:', allTracks);
  }, [allTracks]);
  
  // Listen for video-ended events (separate effect)
  useEffect(() => {
    const unlisten = Tauri.event.listen('video-ended', () => {
      console.log('Video ended event received. Advancing to next slide.');
      // Simulate ArrowDown key press
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true,
      }));
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  useEffect(() => {
    // Clean up in case component unmounts while dragging
    const handleUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // VS Code style sidebar resizing
  const startSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const startWidth = sidebarWidth;
    
    draggingRef.current = { type: 'sidebar', startX, startWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize'; // Double arrow horizontal cursor

    const onMove = (ev) => {
      if (!draggingRef.current || draggingRef.current.type !== 'sidebar') return;
      const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
      const { startX, startWidth } = draggingRef.current;
      const dx = clientX - startX;
      const minWidth = 200; // minimum sidebar width
      const maxWidth = 600; // maximum sidebar width

      // Use RAF to throttle layout updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        let newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
        setSidebarWidth(newWidth);
        localStorage.setItem('rp_sidebarWidth', String(newWidth));
      });
    };

    const onUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  // VS Code style multitrack panel resizing
  const startMultitrackResize = (e) => {
    e.preventDefault();
    const startY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    const startHeight = multitrackHeight;
    
    draggingRef.current = { type: 'multitrack', startY, startHeight };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize'; // Double arrow vertical cursor

    const onMove = (ev) => {
      if (!draggingRef.current || draggingRef.current.type !== 'multitrack') return;
      const clientY = ev.type.startsWith('touch') ? ev.touches[0].clientY : ev.clientY;
      const { startY, startHeight } = draggingRef.current;
      const dy = startY - clientY; // Inverted because we're dragging up to increase height
      const minHeight = 100; // minimum multitrack height
      const maxHeight = 400; // maximum multitrack height

      // Use RAF to throttle layout updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        let newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + dy));
        setMultitrackHeight(newHeight);
        localStorage.setItem('rp_multitrackHeight', String(newHeight));
      });
    };

    const onUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  const resetSidebar = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    localStorage.removeItem('rp_sidebarWidth');
  };

  const resetMultitrack = () => {
    setMultitrackHeight(DEFAULT_MULTITRACK_HEIGHT);
    localStorage.removeItem('rp_multitrackHeight');
  };

  // Direct import handlers (no library dependency)
  const handleDirectImport = async (type) => {
    try {
      if (type === 'song') {
        await handleImportSong();
        // Add to service order directly
        addToServiceOrder({
          type: 'song',
          name: 'Imported Song',
          slides: [],
          tracks: []
        });
      } else if (type === 'presentation') {
        await handleImportPresentation();
        // Add to service order directly
        addToServiceOrder({
          type: 'presentation', 
          name: 'Imported Presentation',
          slides: [],
          tracks: []
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  // Listen for display settings menu event
  useEffect(() => {
    const unlisten = Tauri.event.listen('display-settings-clicked', () => {
      setIsDisplaySettingsOpen(true);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Listen for presentation imported event to trigger library refresh
  useEffect(() => {
    const unlisten = Tauri.event.listen('presentation-imported', () => {
        setPresentationImportedTrigger(prev => prev + 1);
    });

    return () => {
        unlisten.then(f => f());
    };
  }, []);

  // Listen for display settings menu event
  useEffect(() => {
    const unlisten = Tauri.event.listen('display-settings-clicked', () => {
      setIsDisplaySettingsOpen(true);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-300 vscode-ui-font flex" ref={containerRef}>
      {/* VS Code Activity Bar */}
      <div className="vscode-activity-bar">
        <ActivityBarIcon 
          icon={<PresentationChartBarIcon className="w-6 h-6" />} 
          label="Service Order" 
          active={true}
        />
        <ActivityBarIcon 
          icon={<MusicalNoteIcon className="w-6 h-6" />} 
          label="Import Song" 
          onClick={() => handleDirectImport('song')}
        />
        <ActivityBarIcon 
          icon={<PresentationChartBarIcon className="w-6 h-6" />} 
          label="Import Presentation" 
          onClick={() => handleDirectImport('presentation')}
        />
        <ActivityBarIcon 
          icon={<CogIcon className="w-6 h-6" />} 
          label="Settings" 
          onClick={() => setIsDisplaySettingsOpen(true)}
        />
      </div>

      {/* Main Layout: Service Order Sidebar + Slide Editor */}
      <div className="flex-1 flex">
        {/* Service Order Sidebar */}
        <div 
          className="vscode-sidebar bg-gray-800 border-r border-gray-700"
          style={{ width: `${sidebarWidth}px` }}
        >
          <SetlistManager 
            setAllSlides={setAllSlides} 
            setAllTracks={setAllTracks} 
            serviceOrder={serviceOrder} 
            setServiceOrder={setServiceOrder} 
          />
        </div>

        {/* VS Code Resize Handle for Sidebar */}
        <div
          className="vscode-resize-handle-vertical"
          onMouseDown={startSidebarResize}
          onDoubleClick={resetSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Slide Editor */}
          <div className="flex-1 overflow-hidden">
            <SlideManager 
              allSlides={allSlides} 
              setAllSlides={setAllSlides} 
              selectedSlide={selectedSlide} 
              setSelectedSlide={setSelectedSlide} 
            />
          </div>

          {/* VS Code Resize Handle for Multitrack */}
          <div
            className="vscode-resize-handle-horizontal"
            onMouseDown={startMultitrackResize}
            onDoubleClick={resetMultitrack}
          />

          {/* Multitrack Panel */}
          <div 
            className="bg-gray-800 border-t border-gray-700"
            style={{ height: `${multitrackHeight}px` }}
          >
            <MultitrackPlayer allTracks={allTracks} />
          </div>
        </div>
      </div>

      <DisplaySettings
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
      />
    </div>
  );
};

export default App;