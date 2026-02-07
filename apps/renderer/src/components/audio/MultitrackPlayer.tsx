import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../../viewmodels';
import TrackControl from './TrackControl';
import TransposeModal from './TransposeModal';
import { VSCodePanel } from '../VSCodeUI.tsx';
import { PlayIcon, PauseIcon, BackwardIcon, RocketLaunchIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import type { Track } from '../../types/audio';

interface MultitrackPlayerProps {
  allTracks: Track[];
  isLoadingTracks: boolean;
}

// Helper functions
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

const MultitrackPlayer = observer(({ allTracks, isLoadingTracks }: MultitrackPlayerProps) => {
  const viewModel = getViewModel('audioViewModel');

  useEffect(() => {
    viewModel.updateCurrentDirectoryFromTracks(allTracks);
    viewModel.setupTransposeProgressListener();
    return () => viewModel.cleanupTransposeListener();
  }, [allTracks]);

  return (
    <div id="multitrack-player" className="h-full flex flex-col">
      <VSCodePanel title="Multitrack Player" className="h-full flex flex-col text-primary">
      {/* Audio Service Status Bar */}
      <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-gray-700 bg-opacity-50 rounded text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            viewModel.audioServiceStatus === 'connected' ? 'bg-green-500' : 
            viewModel.audioServiceStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`}></span>
          <span className={`${
            viewModel.audioServiceStatus === 'connected' ? 'text-green-300' : 
            viewModel.audioServiceStatus === 'connecting' ? 'text-yellow-300' : 'text-red-300'
          }`}>
            {viewModel.audioServiceStatus === 'connected' ? '✓ Audio Ready' : 
             viewModel.audioServiceStatus === 'connecting' ? '⟳ Connecting' : '✕ Error'}
          </span>
        </div>
        <div className="text-gray-400">
          {allTracks.length > 0 && <span>{allTracks.length} tracks</span>}
          {viewModel.memoryUsage && <span className="ml-3">Mem: {(viewModel.memoryUsage.rss / 1024 / 1024).toFixed(0)}MB</span>}
        </div>
      </div>

      {/* Service Error Message */}
      {viewModel.audioServiceStatus === 'error' && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            🎵 Audio Service Required
          </div>
          <div className="text-xs text-red-600 dark:text-red-300 mb-3">
            {viewModel.serviceError || 'The Node.js audio service is not running.'}
          </div>
          
          {/* Start Service Button */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => viewModel.startAudioService()}
              disabled={viewModel.isStartingService}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewModel.isStartingService 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RocketLaunchIcon className={`w-4 h-4 ${viewModel.isStartingService ? 'animate-spin' : ''}`} />
              {viewModel.isStartingService ? 'Starting Service...' : 'Start Audio Service'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              or start manually:
            </span>
          </div>
          
          {/* Manual Instructions */}
          <div className="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">
            cd harmonysync-audio-service<br/>
            ./start-service.sh start
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3 p-2 bg-gray-700 bg-opacity-30 rounded-md">
        {/* Playback Controls Group */}
        <div className="flex items-center gap-1.5 border-r border-gray-600 pr-3">
          <button 
            aria-label="Play all tracks" 
            title="Play All" 
            className="p-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm" 
            onClick={() => viewModel.playAll()}
            disabled={viewModel.isOperationInProgress || allTracks.length === 0}
          >
            <PlayIcon className="w-5 h-5" />
          </button>

          <button 
            aria-label="Stop all tracks" 
            title="Stop All" 
            className="p-2.5 bg-red-700 hover:bg-red-600 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm" 
            onClick={() => viewModel.stopAll()}
            disabled={viewModel.isOperationInProgress}
          >
            <PauseIcon className="w-5 h-5" />
          </button>

          <button 
            aria-label="Restart all tracks" 
            title="Start From Beginning" 
            className="p-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm" 
            onClick={() => viewModel.goToBeginning()}
            disabled={viewModel.isOperationInProgress || allTracks.length === 0}
          >
            <BackwardIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Transpose Controls Group */}
        <div className="flex items-center gap-2 border-r border-gray-600 pr-3">
          <span className="text-xs text-gray-400 font-medium">Transpose:</span>
          <button 
            aria-label="Transpose down" 
            title="Transpose Down (-1)" 
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            onClick={() => viewModel.transposeAudio(-1, viewModel.currentSongPath, allTracks)}
            disabled={allTracks.length === 0 || !viewModel.currentSongPath}
          >
            <ArrowDownIcon className="w-4 h-4" />
          </button>
          <button 
            aria-label="Transpose up" 
            title="Transpose Up (+1)" 
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            onClick={() => viewModel.transposeAudio(1, viewModel.currentSongPath, allTracks)}
            disabled={allTracks.length === 0 || !viewModel.currentSongPath}
          >
            <ArrowUpIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3 border-l border-gray-600 pl-3">
          <label htmlFor="volume-slider" className="text-xs text-gray-400 font-medium">Volume</label>
          <input
            type="range"
            id="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={viewModel.globalVolume}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => viewModel.setGlobalVolume(parseFloat(e.target.value))}
            className="w-24 sm:w-28 md:w-32 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <span className="text-xs text-gray-400 w-6 text-right font-medium">{Math.round(viewModel.globalVolume * 100)}%</span>
        </div>
      </div>

      {/* Transpose Modal */}
      <TransposeModal
        isOpen={viewModel.isTransposeModalOpen}
        currentFile={viewModel.transposeProgress.currentFile}
        totalFiles={viewModel.transposeProgress.totalFiles}
        completedFiles={viewModel.transposeProgress.completedFiles}
        message={viewModel.transposeProgress.message}
        onClose={() => viewModel.closeTransposeModal()}
      />

      {isLoadingTracks ? (
        <div className="flex items-center justify-center py-8 text-muted">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span>Loading tracks...</span>
          </div>
        </div>
      ) : allTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-surface rounded-md">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-lg font-semibold text-primary mb-2">No Audio Tracks Loaded</h3>
          <p className="text-sm text-muted max-w-md">
            Select a song from the setlist to load audio tracks. Each track will appear here as a control card.
          </p>
          <p className="text-xs text-muted mt-3 max-w-md">
            💡 <strong>Tip:</strong> Click on track names to mute/unmute. Tracks are automatically panned left/right based on their names.
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center justify-between mb-3 flex-shrink-0 pb-2 border-b border-gray-600">
            <h3 className="text-sm font-semibold text-gray-200">
              🎚️ Mixer
            </h3>
            <div className="text-xs text-gray-500">
              Click name to mute
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 overflow-y-auto flex-1 min-h-0" id="track-controls">
            {allTracks.sort(sortTracks).map((track) => (
              <TrackControl 
                key={track.id} 
                track={track} 
                // TrackControl handles mute internally via setTrackMute from audio utils
                onMuteToggle={(track: Track, newMuteState: boolean) => {
                  console.log(`🔇 Mute updated for track ${track.name}: ${newMuteState}`);
                }}
              />
            ))}
          </div>
        </div>
      )}
      </VSCodePanel>
    </div>
  );
});

export default MultitrackPlayer;
