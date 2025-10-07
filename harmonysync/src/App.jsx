import React, { useState, useEffect } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import ScreenButtons from './ScreenButtons.jsx';
import SetlistManager from './SetlistManager.jsx';
import SlideManager from './SlideManager.jsx';
import MultitrackPlayer from './MultitrackPlayer.jsx';

const App = () => {
  const [allSlides, setAllSlides] = useState([]);
  const [allTracks, setAllTracks] = useState([]);

  useEffect(() => {
    const unlisten = TauriEvent.listen('video-ended', () => {
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

  return (
    <>
      <div className="container">
        <SetlistManager setAllSlides={setAllSlides} setAllTracks={setAllTracks} />
        <SlideManager allSlides={allSlides} setAllSlides={allSlides} />
        <ScreenButtons />
      </div>
      <MultitrackPlayer allTracks={allTracks} />
    </>
  );
};

export default App;