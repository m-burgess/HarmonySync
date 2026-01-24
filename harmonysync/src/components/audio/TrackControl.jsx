import React, { useState, useEffect } from 'react';
import { setTrackMute } from '../../utils/audio';
import TrackControlCard from './TrackControlCard.jsx';

const TrackControl = ({ track, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState(track.isMuted || false);

  // Sync with track prop changes
  useEffect(() => {
    setIsMuted(track.isMuted || false);
  }, [track.isMuted]);

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

  return (
    <TrackControlCard
      trackId={track.id}
      trackName={track.name}
      isMuted={isMuted}
      onMuteToggle={handleMuteToggle}
    />
  );
};

export default TrackControl;