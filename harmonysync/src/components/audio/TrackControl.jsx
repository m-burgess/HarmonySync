import React, { useState, useEffect } from 'react';
import { setPan, setTrackMute } from '../../utils/audio';
import TrackControlCard from './TrackControlCard.jsx';

const TrackControl = ({ track, onPanChange, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState(track.isMuted || false);
  const [panValue, setPanValue] = useState(track.panValue || 0);

  // Sync with track prop changes
  useEffect(() => {
    setIsMuted(track.isMuted || false);
    setPanValue(track.panValue || 0);
  }, [track.isMuted, track.panValue]);

  const handleMuteToggle = async (trackId, newMuteState) => {
    console.log(`🔇 [TrackControl] Toggle mute for track ${track.name}: ${newMuteState}`);
    console.log(`🔍 [TrackControl] Track object:`, track);
    console.log(`🔍 [TrackControl] Track ID: ${track.id}, New mute state: ${newMuteState}`);
    
    try {
      // Update audio service
      await setTrackMute(track, newMuteState);
      
      // Update local state
      setIsMuted(newMuteState);
      
      // Notify parent component
      if (onMuteToggle) {
        onMuteToggle(track, newMuteState);
      }
    } catch (error) {
      console.error('❌ [TrackControl] Failed to toggle track mute:', error);
    }
  };

  const handlePanChange = async (trackId, newPanValue) => {
    console.log(`🎛️ [TrackControl] Pan change for track ${track.name}: ${newPanValue}`);
    console.log(`🔍 [TrackControl] Track object:`, track);
    console.log(`🔍 [TrackControl] Track ID: ${track.id}, New pan value: ${newPanValue}`);
    
    try {
      // Update audio service
      await setPan(track, newPanValue);
      
      // Update local state
      setPanValue(newPanValue);
      
      // Notify parent component
      if (onPanChange) {
        onPanChange(track, newPanValue);
      }
    } catch (error) {
      console.error('❌ [TrackControl] Failed to change track pan:', error);
    }
  };

  return (
    <TrackControlCard
      trackId={track.id}
      trackName={track.name}
      panValue={panValue}
      isMuted={isMuted}
      onPanChange={handlePanChange}
      onMuteToggle={handleMuteToggle}
    />
  );
};

export default TrackControl;