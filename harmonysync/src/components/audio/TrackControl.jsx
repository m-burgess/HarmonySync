import React, { useState, useEffect } from 'react';
import { setPan } from '../../utils/audio';
import TrackControlCard from './TrackControlCard.jsx';

const TrackControl = ({ track, onPanChange, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState(track.isMuted || false);
  const [panValue, setPanValue] = useState(track.panValue || 0);

  useEffect(() => {
    // Update track's gain node when mute state changes
    // Note: gainNode is created lazily on first play
    if (track.gainNode) {
      track.gainNode.gain.value = isMuted ? 0 : (track.volume || 0.7);
    }
    // Store mute state on track for playAllTracks to use
    track.isMuted = isMuted;
  }, [isMuted, track]);

  useEffect(() => {
    // Update track's panner node when pan value changes
    // Note: pannerNode is created lazily on first play
    if (track.pannerNode) {
      setPan(track, panValue);
    }
    // Store pan value on track for later use
    track.panValue = panValue;
  }, [panValue, track]);

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