import React, { useState, useEffect } from 'react';
import { playAllTracks, stopAllAudio, goToBeginningAllTracks, getTracks, setGlobalVolume } from './audio.js';
import TrackControl from './TrackControl.jsx';

const MultitrackPlayer = ({ allTracks }) => {
  const [globalVolume, setGlobalVolumeState] = useState(1);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setGlobalVolumeState(newVolume);
    setGlobalVolume(newVolume); // Assuming setGlobalVolume exists in audio.js
  };

  const handlePanChange = (track, newPanValue) => {
    // Update the track object directly or through a state update if allTracks was stateful
    track.panValue = newPanValue;
    // If allTracks is managed by useState in a parent, you'd need to update that state
    // For now, direct modification of the track object is assumed to be sufficient
  };

  const handleMuteToggle = (track, newMuteState) => {
    track.isMuted = newMuteState;
  };

  return (
    <div id="multitrack-player">
      <div className="player-controls">
        <button onClick={playAllTracks}>Play All</button>
        <button onClick={stopAllAudio}>Stop All</button>
        <button onClick={goToBeginningAllTracks}>Start From Beginning</button>
        <input
          type="range"
          id="volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={globalVolume}
          onChange={handleVolumeChange}
        />
        <label htmlFor="volume-slider">Volume</label>
      </div>
      <div className="track-controls" id="track-controls">
        {allTracks.map((track, index) => (
          <TrackControl
            key={index}
            track={track}
            onPanChange={handlePanChange}
            onMuteToggle={handleMuteToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default MultitrackPlayer;
