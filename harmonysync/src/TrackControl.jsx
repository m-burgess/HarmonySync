import React, { useState, useEffect } from 'react';
import { setPan } from './audio.js';
import { TrackControlCard } from './components/audio';

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

  const handleVolumeChange = (trackId, newVolume) => {
    setVolume(newVolume);
    // The gainNode update is handled by the useEffect above
  };

  const handleMuteToggle = (trackId, newMuteState) => {
    setIsMuted(newMuteState);
    onMuteToggle(track, newMuteState); // Notify parent of mute state change
  };

  const handlePanChange = (trackId, newPanValue) => {
    setPanValue(newPanValue);
    onPanChange(track, newPanValue); // Notify parent of pan state change
  };

  return (
    <TrackControlCard
      trackId={track.path}
      trackName={track.name}
      volume={volume}
      panValue={panValue}
      isMuted={isMuted}
      onVolumeChange={handleVolumeChange}
      onPanChange={handlePanChange}
      onMuteToggle={handleMuteToggle}
    />
  );
};

export default TrackControl;