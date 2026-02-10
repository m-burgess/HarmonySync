import React, { useState, useEffect } from 'react';
import { setTrackMute } from '../../utils/audio';
import TrackControlCard from './TrackControlCard';
import type { Track } from '../../types/audio';

interface TrackControlProps {
  track: Track;
  onMuteToggle?: (track: Track, newMuteState: boolean) => void;
}

const TrackControl: React.FC<TrackControlProps> = ({ track, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState<boolean>(track.isMuted || false);

  // Sync with track prop changes
  useEffect(() => {
    setIsMuted(track.isMuted || false);
  }, [track.isMuted]);

  const handleMuteToggle = async (_trackId: string, newMuteState: boolean): Promise<void> => {
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
      isPreloaded={track.isPreloaded}
      preloadStatus={track.preloadStatus}
    />
  );
};

export default TrackControl;
