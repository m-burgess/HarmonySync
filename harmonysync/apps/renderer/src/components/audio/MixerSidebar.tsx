/**
 * MixerSidebar - MVVM Refactored View Component
 * 
 * This component is refactored to use MVVM architecture:
 * - All business logic moved to MixerViewModel
 * - Component wrapped with observer() to react to ViewModel changes
 * - No useState for business state
 * - Pure presentation logic only (~80 lines vs original 144 lines)
 */
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../../viewmodels';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import type { Track } from '../../types/audio';
import '../../styles/components/MixerSidebar.css';

interface MixerSidebarProps {
  allTracks: Track[];
  isLoadingTracks: boolean;
}

const MixerSidebar = observer(({ allTracks, isLoadingTracks }: MixerSidebarProps) => {
  const viewModel = getViewModel('mixerViewModel');

  // Sync tracks from parent component (bridge until full MVVM refactor)
  useEffect(() => {
    if (allTracks) {
      viewModel.setTracks(allTracks);
    }
  }, [allTracks]);

  // Sync loading state
  useEffect(() => {
    viewModel.isLoadingTracks = isLoadingTracks;
  }, [isLoadingTracks]);

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
              onClick={() => viewModel.playAll()}
              disabled={!viewModel.canPlay}
              className="p-1.5 bg-green-700 hover:bg-green-600 rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Play All"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => viewModel.stopAll()}
              disabled={!viewModel.canStop}
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
        {viewModel.isLoadingTracks ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading tracks...
          </div>
        ) : !viewModel.hasTracks ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-2">
            Load a song to see tracks
          </div>
        ) : (
          <div className="space-y-1">
            {viewModel.sortedTracks.map((track: Track) => (
              <button
                key={track.id}
                onClick={() => viewModel.toggleMute(track)}
                className={`mixer-track-item ${viewModel.muteStates[track.id] ? 'muted' : ''}`}
              >
                {/* Icon */}
                <span className="mixer-track-icon">
                  {viewModel.muteStates[track.id] ? '🔇' : '🔊'}
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
});

export default MixerSidebar;
