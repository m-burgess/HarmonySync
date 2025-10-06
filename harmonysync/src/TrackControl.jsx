import React, { useState, useEffect } from 'react';
import { setPan } from './audio.js';

const TrackControl = ({ track, onPanChange, onMuteToggle }) => {
  const [volume, setVolume] = useState(track.individualVolume || 0.7);
  const [isMuted, setIsMuted] = useState(track.isMuted || false);
  const [panValue, setPanValue] = useState(track.panValue || 0);

  useEffect(() => {
    // Update track's gain node when volume or mute state changes
    if (track.gainNode) {
      track.gainNode.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, track.gainNode]);

  useEffect(() => {
    // Update track's panner node when pan value changes
    if (track.pannerNode) {
      setPan(track, panValue);
    }
  }, [panValue, track.pannerNode, track]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // The gainNode update is handled by the useEffect above
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
    onMuteToggle(track, !isMuted); // Notify parent of mute state change
  };

  const handlePanChange = (newPanValue) => {
    setPanValue(newPanValue);
    onPanChange(track, newPanValue); // Notify parent of pan state change
  };

  return (
    <div className="track" data-path={track.path}>
      <span className="track-name">{track.name}</span>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        className="volume-slider"
        onChange={handleVolumeChange}
        disabled={isMuted}
      />

      <div className="pan-controls">
        <button
          className={`pan-button pan-left ${panValue === -1 ? 'active-pan' : ''}`}
          onClick={() => handlePanChange(-1)}
        >
          L
        </button>
        <button
          className={`pan-button pan-center ${panValue === 0 ? 'active-pan' : ''}`}
          onClick={() => handlePanChange(0)}
        >
          C
        </button>
        <button
          className={`pan-button pan-right ${panValue === 1 ? 'active-pan' : ''}`}
          onClick={() => handlePanChange(1)}
        >
          R
        </button>
      </div>

      <button
        className={`mute-button ${isMuted ? 'active' : ''}`}
        onClick={handleMuteToggle}
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
};

export default TrackControl;