import React, { useState, useEffect, useRef } from 'react';
import * as Tauri from '@tauri-apps/api';

import './App.css';
import LibraryTabs from './LibraryTabs.jsx';
import ScreenButtons from './ScreenButtons.jsx';
import SetlistManager from './SetlistManager.jsx';
import SlideManager from './SlideManager.jsx';
import SlideInfo from './SlideInfo.jsx';
import MultitrackPlayer from './MultitrackPlayer.jsx';


import { parseLyricsToSlides } from './lyrics.js';
import { loadAudioFile, getAudioContext, getTracks, applyDefaultPanning } from './audio.js';


// This function lets the user select a folder and then calls the backend to import it.
async function handleImportSong() {
  try {
    // Open a dialog for the user to select a directory.
  const selectedPath = await dialog.open({
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
  const selectedPath = await dialog.open({
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
  const [songImportedTrigger, setSongImportedTrigger] = useState(0);
  const [presentationImportedTrigger, setPresentationImportedTrigger] = useState(0);
  const [serviceOrder, setServiceOrder] = useState([]); // New state for service order
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const containerRef = useRef(null);

  // Resizable columns: left and right widths in pixels. Middle column is flexible (1fr).
  const DEFAULT_LEFT = 300;
  const DEFAULT_RIGHT = 300;
  const [leftWidth, setLeftWidth] = useState(() => {
    const v = parseInt(localStorage.getItem('rp_leftWidth'), 10);
    return isNaN(v) ? DEFAULT_LEFT : v;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const v = parseInt(localStorage.getItem('rp_rightWidth'), 10);
    return isNaN(v) ? DEFAULT_RIGHT : v;
  });
  const draggingRef = useRef(null);
  const rafRef = useRef(null);

  const handleAddSongToSetlist = async (songId, songTitle) => {
    setServiceOrder(prevOrder => [...prevOrder, { type: 'song', id: songId, name: songTitle, loaded: false, slides: [], tracks: [] }]);
  };

  const handleAddPresentationToSetlist = async (presentationId, presentationName) => {
    setServiceOrder(prevOrder => [...prevOrder, { type: 'presentation', id: presentationId, name: presentationName, loaded: false, slides: [], tracks: [] }]);
  };

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

  const startDrag = (side, e) => {
    // side: 'left' or 'right'
    e.preventDefault();
    const startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    draggingRef.current = { side, startX, startLeft, startRight, containerWidth: containerRect.width };
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!draggingRef.current) return;
      const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
      const { side, startX, startLeft, startRight, containerWidth } = draggingRef.current;
      const dx = clientX - startX;
      const minCol = 120; // minimum px for any column

      // Use RAF to throttle layout updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (side === 'left') {
          let newLeft = Math.max(minCol, startLeft + dx);
          // ensure there's room for right column
          const maxLeft = containerWidth - startRight - minCol;
          if (newLeft > maxLeft) newLeft = maxLeft;
          setLeftWidth(newLeft);
          localStorage.setItem('rp_leftWidth', String(newLeft));
        } else if (side === 'right') {
          let newRight = Math.max(minCol, startRight - dx);
          const maxRight = containerWidth - startLeft - minCol;
          if (newRight > maxRight) newRight = maxRight;
          setRightWidth(newRight);
          localStorage.setItem('rp_rightWidth', String(newRight));
        }
      });
    };

    const onUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
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

  const resetColumns = () => {
    setLeftWidth(DEFAULT_LEFT);
    setRightWidth(DEFAULT_RIGHT);
    localStorage.removeItem('rp_leftWidth');
    localStorage.removeItem('rp_rightWidth');
  };

  useEffect(() => {
    const unlisten = Tauri.event.listen('import-song-clicked', () => {
      handleImportSong();
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Listen for song imported event to trigger library refresh
  useEffect(() => {
    const unlisten = Tauri.event.listen('song-imported', () => {
      setSongImportedTrigger(prev => prev + 1);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = Tauri.event.listen('import-presentation-clicked', () => {
        handleImportPresentation();
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

  return (
    <div className="app-container">
      {isLibraryVisible && <LibraryTabs onAddSongToSetlist={handleAddSongToSetlist} onAddPresentationToSetlist={handleAddPresentationToSetlist} songImportedTrigger={songImportedTrigger} presentationImportedTrigger={presentationImportedTrigger} />}
      <main className="main-content">
        <div className="p-2">
          <button className="px-2 py-1 rounded bg-gray-700 text-sm" onClick={() => setIsLibraryVisible(!isLibraryVisible)}>
            {isLibraryVisible ? 'Hide Library' : 'Show Library'}
          </button>
        </div>

        <div className="container relative" ref={containerRef} style={{ gridTemplateColumns: `${leftWidth}px 1fr ${rightWidth}px` }}>
          {/* Left column */}
          <div className="left-col overflow-auto">
            <SetlistManager setAllSlides={setAllSlides} setAllTracks={setAllTracks} serviceOrder={serviceOrder} setServiceOrder={setServiceOrder} />
          </div>

          {/* Middle column */}
          <div className="middle-col overflow-auto">
            <SlideManager allSlides={allSlides} setAllSlides={setAllSlides} selectedSlide={selectedSlide} setSelectedSlide={setSelectedSlide} />
          </div>

          {/* Right column: combine buttons + slide info */}
          <div className="right-col overflow-auto flex flex-col">
            <ScreenButtons />
            <SlideInfo selectedSlide={selectedSlide} />
          </div>

          {/* Left gutter (between left and middle) */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(e) => startDrag('left', e)}
            onDoubleClick={() => resetColumns()}
            className="absolute top-0 bottom-0 w-6 -translate-x-3 bg-transparent hover:bg-gray-600/10 z-20 cursor-col-resize flex items-center justify-center"
            style={{ left: `${leftWidth}px` }}
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
            </div>
          </div>

          {/* Right gutter (between middle and right) */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(e) => startDrag('right', e)}
            onDoubleClick={() => resetColumns()}
            className="absolute top-0 bottom-0 w-6 -translate-x-3 bg-transparent hover:bg-gray-600/10 z-20 cursor-col-resize flex items-center justify-center"
            style={{ left: `calc(100% - ${rightWidth}px)` }}
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
              <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
            </div>
          </div>
        </div>

        <div className="multitrack-area">
          <MultitrackPlayer allTracks={allTracks} />
        </div>
      </main>
    </div>
  );
};

export default App;