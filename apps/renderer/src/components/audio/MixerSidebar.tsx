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
import { runInAction } from 'mobx';
import { getViewModel } from '../../viewmodels';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { VSCodePanel } from '../VSCodeUI.tsx';
import Button from '../ui/Button.tsx';
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
    runInAction(() => {
      viewModel.isLoadingTracks = isLoadingTracks;
    });
  }, [isLoadingTracks, viewModel]);

  return (
    <div className="mixer-sidebar h-full flex flex-col overflow-hidden">
      <VSCodePanel title="Mixer" className="mixer-sidebar-panel h-full flex flex-col">
        {/* Header with Controls */}
        <div className="mixer-controls">
          <div className="mixer-controls-group">
            <Button
              onClick={() => viewModel.playAll()}
              disabled={!viewModel.canPlay}
              title="Play All"
              size="small"
              variant="success"
              icon={<PlayIcon className="w-4 h-4" />}
              aria-label="Play all tracks"
            />
            <Button
              onClick={() => viewModel.stopAll()}
              disabled={!viewModel.canStop}
              title="Stop All"
              size="small"
              variant="danger"
              icon={<PauseIcon className="w-4 h-4" />}
              aria-label="Stop all tracks"
            />
          </div>
        </div>

        {/* Tracks List */}
        <div className="mixer-track-list">
          {viewModel.isLoadingTracks ? (
            <div className="mixer-empty-state">
              Loading tracks...
            </div>
          ) : !viewModel.hasTracks ? (
            <div className="mixer-empty-state">
              Load a song to see tracks
            </div>
          ) : (
            <div className="mixer-track-stack space-y-2 p-2">
              {viewModel.sortedTracks.map((track: Track, index: number) => (
                <div
                  key={track.id}
                  className={`mixer-track-item flex flex-col p-2 rounded bg-gray-800 border ${viewModel.muteStates[track.id] ? 'border-red-900 bg-opacity-50' : 'border-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="mixer-track-name text-xs font-medium truncate flex-1 mr-2"
                      title={track.name}
                    >
                      {(track.name || `Track ${index + 1}`)
                        .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '')
                        .replace(/[-_]/g, ' ')
                        .trim()
                      }
                    </span>
                    <Button
                      onClick={() => viewModel.toggleMute(index)}
                      className={`w-6 h-6 flex items-center justify-center p-0 ${viewModel.muteStates[track.id] ? 'text-red-500' : 'text-green-500'}`}
                      variant="ghost"
                      size="small"
                      title={viewModel.muteStates[track.id] ? "Unmute" : "Mute"}
                    >
                      {viewModel.muteStates[track.id] ? '🔇' : '🔊'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </VSCodePanel>
    </div>
  );
});

export default MixerSidebar;
