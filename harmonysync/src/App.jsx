import React, { useState, useEffect } from 'react';
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
    const selectedPath = await Tauri.dialog.open({
      directory: true,
      multiple: false,
      title: 'Select Song Folder',
    });

    if (typeof selectedPath === 'string') {
      // If a folder was selected, call the import command.
      console.log(`Importing song from: ${selectedPath}`);
      await Tauri.core.invoke('import_song_folder', {
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
        const selectedPath = await Tauri.dialog.open({
            directory: true,
            multiple: false,
            title: 'Select Presentation Folder',
        });

        if (typeof selectedPath === 'string') {
            console.log(`Importing presentation from: ${selectedPath}`);
            await Tauri.core.invoke('import_presentation_folder', {
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
        <button onClick={() => setIsLibraryVisible(!isLibraryVisible)}>
            {isLibraryVisible ? 'Hide Library' : 'Show Library'}
        </button>
        <div className="container">
          <SetlistManager setAllSlides={setAllSlides} setAllTracks={setAllTracks} serviceOrder={serviceOrder} setServiceOrder={setServiceOrder} />
          <SlideManager allSlides={allSlides} setAllSlides={setAllSlides} selectedSlide={selectedSlide} setSelectedSlide={setSelectedSlide} />
          <ScreenButtons />
          <SlideInfo selectedSlide={selectedSlide} />
        </div>
        <MultitrackPlayer allTracks={allTracks} />
      </main>
    </div>
  );
};

export default App;