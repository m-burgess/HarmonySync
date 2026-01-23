import React, { useState, useEffect, useRef } from 'react';
import { core, event } from './electron-adapter';
import { 
  PresentationChartBarIcon, 
  CogIcon,
  SpeakerWaveIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  PlayIcon,
  CalendarIcon,
  MusicalNoteIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

import './styles/App.css';
import './styles/vscode-theme.css';
import { 
  ActivityBarIcon, 
  VSCodeStatusBar 
} from './components/VSCodeUI.jsx';
import SetlistManager from './components/setlist/SetlistManager.jsx';
import SlideManager from './components/slides/SlideManager.jsx';
import LyricsColumn from './components/lyrics/LyricsColumn.jsx';
import MultitrackPlayer from './components/audio/MultitrackPlayer.jsx';
import DisplaySettings from './components/screens/DisplaySettings.jsx';
import AudioSettings from './components/screens/AudioSettings.jsx';
import DmxControlPanel from './components/dmx/DmxControlPanel.jsx';





const App = () => {
  const [allSlides, setAllSlides] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [serviceOrder, setServiceOrder] = useState([]); // New state for service order
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [currentLyrics, setCurrentLyrics] = useState(null); // Current song lyrics for scrollable column
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isDmxPanelOpen, setIsDmxPanelOpen] = useState(false);
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
  
  // Listen for tracks-updated events (from transpose)
  useEffect(() => {
    const unlisten = event.listen('tracks-updated', (evt) => {
      console.log('[App] Tracks updated event received:', evt.payload);
      setAllTracks(evt.payload);
    });

    return unlisten;
  }, []);
  
  // Listen for video-ended events (separate effect)
  useEffect(() => {
    const unlisten = event.listen('video-ended', () => {
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

    return unlisten;
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

  // Listen for display settings menu event
  useEffect(() => {
    const unlisten = event.listen('display-settings-clicked', () => {
      setIsDisplaySettingsOpen(true);
    });

    return unlisten;
  }, []);

  // Listen for preservice music events from scheduler
  useEffect(() => {
    const unlistenStart = event.listen('start-preservice-music', async () => {
      try {
        await core.invoke('open_preservice_music_window');
      } catch (error) {
        console.error('Failed to open pre-service music window:', error);
      }
    });

    const unlistenStop = event.listen('stop-preservice-music', async () => {
      // Close the preservice music window if it's open
      try {
        await core.invoke('close_preservice_music_window');
      } catch (error) {
        console.error('Failed to close pre-service music window:', error);
      }
    });

    return () => {
      unlistenStart();
      unlistenStop();
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-300 vscode-ui-font flex" ref={containerRef}>
      {/* VS Code Activity Bar */}
      <div className="vscode-activity-bar">
        <ActivityBarIcon 
          icon={<PresentationChartBarIcon className="w-8 h-8" />} 
          label="Service Order" 
          active={true}
        />
        <ActivityBarIcon 
          icon={<CalendarIcon className="w-8 h-8" />} 
          label="Scheduler" 
          onClick={async () => {
            try {
              await core.invoke('open_scheduler_window');
            } catch (error) {
              console.error('Failed to open scheduler window:', error);
            }
          }}
        />
        <ActivityBarIcon 
          icon={<PlayIcon className="w-8 h-8" />} 
          label="Pre-Service Music" 
          onClick={async () => {
            try {
              await core.invoke('open_preservice_music_window');
            } catch (error) {
              console.error('Failed to open pre-service music window:', error);
            }
          }}
        />

        <ActivityBarIcon 
          icon={<MusicalNoteIcon className="w-8 h-8" />} 
          label="Audio/MIDI Settings" 
          onClick={() => setIsAudioSettingsOpen(true)}
        />

        <ActivityBarIcon 
          icon={<LightBulbIcon className="w-8 h-8" />} 
          label="DMX Lighting" 
          onClick={() => setIsDmxPanelOpen(true)}
        />

        <ActivityBarIcon 
          icon={<CogIcon className="w-8 h-8" />} 
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
            setIsLoadingTracks={setIsLoadingTracks}
            setCurrentLyrics={setCurrentLyrics}
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
          {/* Slide Editor or Lyrics Column */}
          <div className="flex-1 overflow-hidden">
            {currentLyrics ? (
              <LyricsColumn lyrics={currentLyrics} />
            ) : (
              <SlideManager 
                allSlides={allSlides} 
                setAllSlides={setAllSlides} 
                selectedSlide={selectedSlide} 
                setSelectedSlide={setSelectedSlide} 
              />
            )}
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
            <MultitrackPlayer allTracks={allTracks} isLoadingTracks={isLoadingTracks} />
          </div>
        </div>
      </div>

      <DisplaySettings
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
      />

      <AudioSettings
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />

      {isDmxPanelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl max-h-screen overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">DMX Lighting Control</h2>
              <button
                onClick={() => setIsDmxPanelOpen(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DmxControlPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;