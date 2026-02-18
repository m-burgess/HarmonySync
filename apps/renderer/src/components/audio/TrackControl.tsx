import React, { useState, useEffect } from 'react';
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

    try {
      // Update local state
      setIsMuted(newMuteState);

      // Notify parent component (which handles the service call via Go engine)
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
