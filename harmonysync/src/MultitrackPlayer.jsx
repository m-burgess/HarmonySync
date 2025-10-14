import React, { useState, useEffect } from 'react';
import { playAllTracks, stopAllAudio, goToBeginningAllTracks, getTracks, setGlobalVolume } from './utils/audio.js';
import TrackControl from './TrackControl.jsx';
import { PlayIcon, PauseIcon, BackwardIcon } from '@heroicons/react/24/solid';

const MultitrackPlayer = ({ allTracks }) => {
  const [globalVolume, setGlobalVolumeState] = useState(1);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setGlobalVolumeState(newVolume);
    setGlobalVolume(newVolume); // Assuming setGlobalVolume exists in audio.js
  };

  const handlePanChange = (track, newPanValue) => {
    track.panValue = newPanValue;
  };

  const handleMuteToggle = (track, newMuteState) => {
    track.isMuted = newMuteState;
  };

  const sortTracks = (a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const customOrder = ['click', 'guide'];
    const aIndex = customOrder.indexOf(aName);
    const bIndex = customOrder.indexOf(bName);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aName.localeCompare(bName);
  };

  return (
    <div id="multitrack-player" className="bg-stage text-primary p-3 rounded-md">
      <div className="flex items-center gap-3 mb-3">
        <button aria-label="Play all tracks" title="Play All" className="p-2 bg-accent rounded-md text-black" onClick={playAllTracks}>
          <PlayIcon className="w-5 h-5" />
        </button>

        <button aria-label="Stop all tracks" title="Stop All" className="p-2 bg-surface rounded-md text-muted" onClick={stopAllAudio}>
          <PauseIcon className="w-5 h-5" />
        </button>

        <button aria-label="Restart all tracks" title="Start From Beginning" className="p-2 bg-surface rounded-md text-muted" onClick={goToBeginningAllTracks}>
          <BackwardIcon className="w-5 h-5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="range"
            id="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={globalVolume}
            onChange={handleVolumeChange}
            className="w-36"
          />
          <label htmlFor="volume-slider" className="text-sm text-muted">Volume</label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 overflow-auto" id="track-controls">
        {allTracks.sort(sortTracks).map((track, index) => (
          <div key={index} className="p-2 bg-surface rounded">
            <TrackControl
              track={track}
              onPanChange={handlePanChange}
              onMuteToggle={handleMuteToggle}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultitrackPlayer;
