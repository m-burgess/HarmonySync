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

  const sortTracks = (a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Define a custom order for specific tracks
    const customOrder = ['click', 'guide'];

    const aIndex = customOrder.indexOf(aName);
    const bIndex = customOrder.indexOf(bName);

    // If both are in customOrder, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only 'a' is in customOrder, 'a' comes first
    if (aIndex !== -1) {
      return -1;
    }
    // If only 'b' is in customOrder, 'b' comes first
    if (bIndex !== -1) {
      return 1;
    }

    // If neither are in customOrder, sort alphabetically
    return aName.localeCompare(bName);
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
        {allTracks.sort(sortTracks).map((track, index) => (
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
