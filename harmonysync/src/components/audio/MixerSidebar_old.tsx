import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { setTrackMute, playAllTracks, stopAllAudio } from '../../utils/audio';
import type { Track } from '../../types/audio';
import '../../styles/components/MixerSidebar.css';

interface MixerSidebarProps {
  allTracks: Track[];
  isLoadingTracks: boolean;
}

interface MuteStates {
  [trackId: string]: boolean;
}

const MixerSidebar: React.FC<MixerSidebarProps> = ({ allTracks, isLoadingTracks }) => {
  const [muteStates, setMuteStates] = useState<MuteStates>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState<boolean>(false);

  // Sync mute states with track data
  useEffect(() => {
    const newStates: MuteStates = {};
    allTracks.forEach(track => {
      newStates[track.id] = track.isMuted || false;
    });
    setMuteStates(newStates);
  }, [allTracks]);

  const handleMuteToggle = async (track: Track): Promise<void> => {
    const newMuteState = !muteStates[track.id];
    
    try {
      // Update audio service
      await setTrackMute(track, newMuteState);
      
      // Update local state
      setMuteStates(prev => ({
        ...prev,
        [track.id]: newMuteState
      }));
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
    }
  };

  const handlePlayAll = async (): Promise<void> => {
    if (isOperationInProgress || allTracks.length === 0) return;
    setIsOperationInProgress(true);
    try {
      await playAllTracks();
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Play failed:', error);
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const handleStopAll = async (): Promise<void> => {
    if (isOperationInProgress) return;
    setIsOperationInProgress(true);
    try {
      await stopAllAudio();
      setIsPlaying(false);
    } catch (error) {
      console.error('❌ Stop failed:', error);
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const sortTracks = (a: Track, b: Track): number => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const customOrder = ['click', 'guide'];
    const aIndex = customOrder.indexOf(aName);
    const bIndex = customOrder.indexOf(bName);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aName.localeCompare(bName);
  };

  return (
    <div className="mixer-sidebar h-full flex flex-col bg-gray-800 border-l border-gray-700 overflow-hidden">
      {/* Header with Controls */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            🎚️ Mixer
          </h3>
          <div className="flex gap-1">
            <button
              onClick={handlePlayAll}
              disabled={isOperationInProgress || allTracks.length === 0}
              className="p-1.5 bg-green-700 hover:bg-green-600 rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Play All"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleStopAll}
              disabled={isOperationInProgress || !isPlaying}
              className="p-1.5 bg-red-700 hover:bg-red-600 rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Stop All"
            >
              <PauseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingTracks ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading tracks...
          </div>
        ) : allTracks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-2">
            Load a song to see tracks
          </div>
        ) : (
          <div className="space-y-1">
            {allTracks.sort(sortTracks).map((track) => (
              <button
                key={track.id}
                onClick={() => handleMuteToggle(track)}
                className={`mixer-track-item ${muteStates[track.id] ? 'muted' : ''}`}
              >
                {/* Icon */}
                <span className="mixer-track-icon">
                  {muteStates[track.id] ? '🔇' : '🔊'}
                </span>
                
                {/* Track Name */}
                <span className="mixer-track-name">
                  {track.name
                    .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '')
                    .replace(/[-_]/g, ' ')
                    .trim()
                  }
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MixerSidebar;
