import React, { useState, useEffect } from 'react';
import { setPan } from './audio.js';
import { SpeakerWaveIcon, SpeakerXMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const TrackControl = ({ track, onPanChange, onMuteToggle }) => {
  const [volume, setVolume] = useState(track.individualVolume || 1);
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
    <div className="track-control" data-path={track.path}>
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

      <div className="pan-controls flex items-center gap-1">
        <button aria-label="Pan left" title="Left" className={`p-1 rounded ${panValue === -1 ? 'bg-yellow-500' : 'bg-surface'}`} onClick={() => handlePanChange(-1)}>
          <ChevronLeftIcon className={`w-4 h-4 ${panValue === -1 ? 'text-black' : 'text-primary'}`} />
        </button>
        <button aria-label="Pan center" title="Center" className={`p-1 rounded ${panValue === 0 ? 'bg-yellow-500' : 'bg-surface'}`} onClick={() => handlePanChange(0)}>
          <div className={`w-4 h-4 flex items-center justify-center text-sm ${panValue === 0 ? 'text-black' : 'text-primary'}`}>C</div>
        </button>
        <button aria-label="Pan right" title="Right" className={`p-1 rounded ${panValue === 1 ? 'bg-yellow-500' : 'bg-surface'}`} onClick={() => handlePanChange(1)}>
          <ChevronRightIcon className={`w-4 h-4 ${panValue === 1 ? 'text-black' : 'text-primary'}`} />
        </button>
      </div>

      <button aria-label={isMuted ? 'Unmute' : 'Mute'} title={isMuted ? 'Unmute' : 'Mute'} className={`p-1 rounded ${isMuted ? 'bg-red-600/20' : 'bg-surface'}`} onClick={handleMuteToggle}>
  {isMuted ? <SpeakerXMarkIcon className="w-4 h-4 text-primary" /> : <SpeakerWaveIcon className="w-4 h-4 text-primary" />}
      </button>
    </div>
  );
};

export default TrackControl;