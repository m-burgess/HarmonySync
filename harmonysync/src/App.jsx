import React, { useState } from 'react';
import ScreenButtons from './ScreenButtons.jsx';
import SetlistManager from './SetlistManager.jsx';
import SlideManager from './SlideManager.jsx';
import MultitrackPlayer from './MultitrackPlayer.jsx';

const App = () => {
  const [allSlides, setAllSlides] = useState([]);
  const [allTracks, setAllTracks] = useState([]);

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