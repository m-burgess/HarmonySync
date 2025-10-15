import React, { useState, useEffect } from 'react';
import { setPan } from '../../utils/audio';
import TrackControlCard from './TrackControlCard.jsx';

const TrackControl = ({ track, onPanChange, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState(track.isMuted || false);
  const [panValue, setPanValue] = useState(track.panValue || 0);

  useEffect(() => {
    // Update track's gain node when mute state changes
    if (track.gainNode) {
      track.gainNode.gain.value = isMuted ? 0 : track.individualVolume || 1;
    }
  }, [isMuted, track.gainNode, track.individualVolume]);

  useEffect(() => {
    // Update track's panner node when pan value changes
    if (track.pannerNode) {
      setPan(track, panValue);
    }
  }, [panValue, track.pannerNode, track]);

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
      panValue={panValue}
      isMuted={isMuted}
      onPanChange={handlePanChange}
      onMuteToggle={handleMuteToggle}
    />
  );
};

export default TrackControl;