import React, { useState, useEffect } from 'react';
import TrackControlCard from './TrackControlCard';
import type { Track } from '../../types/audio';
import { getViewModel } from '../../viewmodels';

interface TrackControlProps {
  track: Track;
  onMuteToggle?: (track: Track, newMuteState: boolean) => void;
}

const TrackControl: React.FC<TrackControlProps> = ({ track, onMuteToggle }) => {
  const [isMuted, setIsMuted] = useState<boolean>(track.isMuted || false);
  const viewModel = getViewModel('audioViewModel');

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
    <div className="flex flex-col">
      <TrackControlCard
        trackId={track.id}
        trackName={track.name}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        isPreloaded={track.isPreloaded}
        preloadStatus={track.preloadStatus}
      />
      {/* Add Pan Slider below the card */}
      <div className="px-2 pb-2 bg-gray-800 rounded-b-lg -mt-1 pt-2">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="text-[10px]">L</span>
          <span className="text-[10px] font-semibold">PAN {track.pan?.toFixed(1) || '0.0'}</span>
          <span className="text-[10px]">R</span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          defaultValue={track.pan || 0}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            // Use index if available, or find another way (index is on track object in AudioViewModel)
            if (typeof (track as any).index === 'number') {
              viewModel.setTrackPan((track as any).index, val);
            } else {
              // Fallback: This might fail if track.index is missing
              console.warn('Track index missing for pan update', track);
            }
          }}
          title={`Pan: ${track.pan || 0}`}
        />
      </div>
    </div>
  );
};

export default TrackControl;
