import React, { useState, useEffect } from 'react';
import { 
  playAllTracks, 
  stopAllAudio, 
  goToBeginningAllTracks, 
  getTracks, 
  setGlobalVolume,
  initializeAudioService,
  getMemoryUsage,
  startMemoryMonitoring,
  cleanupAudio,
  getServiceChecker,
  startAudioServiceFromApp,
  checkAudioServiceStatusFromApp,
  clearTracks,
  addTracks
} from '../../utils/audio';
import TrackControl from './TrackControl.jsx';
import TransposeModal from './TransposeModal.jsx';
import { PlayIcon, PauseIcon, BackwardIcon, RocketLaunchIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { core, event, fs } from '../../electron-adapter';

const MultitrackPlayer = ({ allTracks, isLoadingTracks }) => {
  const [globalVolume, setGlobalVolumeState] = useState(1);
  const [audioServiceStatus, setAudioServiceStatus] = useState('connecting');
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  const [isStartingService, setIsStartingService] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState(null);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  
  // Transpose modal state
  const [isTransposeModalOpen, setIsTransposeModalOpen] = useState(false);
  const [transposeProgress, setTransposeProgress] = useState({
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0,
    message: '',
  });

  // Wrapper functions to prevent multiple rapid operations
  const handlePlayAll = async () => {
    if (isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring playAll');
      return;
    }
    console.log('▶️ Starting playAll operation');
    setIsOperationInProgress(true);
    try {
      await playAllTracks();
      console.log('✅ playAll operation completed');
    } catch (error) {
      console.error('❌ playAll operation failed:', error);
    } finally {
      setTimeout(() => {
        console.log('🔄 Resetting operation in progress flag');
        setIsOperationInProgress(false);
      }, 500);
    }
  };

  const handleStopAll = async () => {
    if (isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring stopAll');
      return;
    }
    console.log('⏹️ Starting stopAll operation');
    setIsOperationInProgress(true);
    try {
      await stopAllAudio();
      console.log('✅ stopAll operation completed');
    } catch (error) {
      console.error('❌ stopAll operation failed:', error);
    } finally {
      setTimeout(() => {
        console.log('🔄 Resetting operation in progress flag');
        setIsOperationInProgress(false);
      }, 500);
    }
  };

  const handleGoToBeginning = async () => {
    if (isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring goToBeginning');
      return;
    }
    console.log('▶️ Starting goToBeginning operation');
    setIsOperationInProgress(true);
    try {
      await goToBeginningAllTracks();
      console.log('✅ goToBeginning operation completed');
    } catch (error) {
      console.error('❌ goToBeginning operation failed:', error);
    } finally {
      // Reset after a longer delay to prevent rapid clicking
      setTimeout(() => {
        console.log('🔄 Resetting operation in progress flag');
        setIsOperationInProgress(false);
      }, 2000);
    }
  };
  useEffect(() => {
    console.log('[MultitrackPlayer] allTracks prop:', allTracks);
    
    // Update current directory based on loaded tracks
    if (allTracks.length > 0 && allTracks[0].path) {
      const trackPath = allTracks[0].path;
      // Extract directory from file path
      const dirPath = trackPath.substring(0, trackPath.lastIndexOf('/'));
      setCurrentDirectory(dirPath);
      console.log('[MultitrackPlayer] Current directory:', dirPath);
    }
    
    const initAudio = async () => {
      try {
        setAudioServiceStatus('connecting');
        setServiceError(null);
        
        await initializeAudioService();
        setAudioServiceStatus('connected');
        
        // Start memory monitoring
        startMemoryMonitoring(10000); // Check every 10 seconds
        
        // Get initial memory usage
        const usage = await getMemoryUsage();
        setMemoryUsage(usage);
        
      } catch (error) {
        console.error('Failed to initialize audio service:', error);
        setAudioServiceStatus('error');
        setServiceError(error.message);
      }
    };

    initAudio();

    // Cleanup on unmount
    return () => {
      cleanupAudio();
    };
  }, [allTracks]);

  // Update memory usage periodically
  useEffect(() => {
    const updateMemory = async () => {
      try {
        const usage = await getMemoryUsage();
        setMemoryUsage(usage);
      } catch (error) {
        console.error('Failed to get memory usage:', error);
      }
    };

    const interval = setInterval(updateMemory, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [audioServiceStatus]);

  useEffect(() => {
    console.log('[MultitrackPlayer] allTracks prop:', allTracks);
  }, [allTracks]);

  // Listen for transpose progress events
  useEffect(() => {
    let unlisten;
    
    const setupListener = async () => {
      unlisten = await event.listen('transpose-progress', (e) => {
        console.log('Transpose progress:', e.payload);
        setTransposeProgress({
          currentFile: e.payload.current_file || '',
          totalFiles: e.payload.total_files || 0,
          completedFiles: e.payload.completed_files || 0,
          message: e.payload.message || '',
        });
      });
    };
    
    setupListener();
    
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setGlobalVolumeState(newVolume);
    setGlobalVolume(newVolume); // Assuming setGlobalVolume exists in audio.js
  };

  const handleMuteToggle = (track, newMuteState) => {
    console.log(`🔇 Mute updated for track ${track.name}: ${newMuteState}`);
    // Update track in allTracks state
    const updatedTracks = allTracks.map(t => 
      t.id === track.id ? { ...t, isMuted: newMuteState } : t
    );
    // Note: We don't call setAllTracks here as it's managed by the parent (App.jsx)
    // The audio service call is handled in TrackControl
  };

  const sortTracks = (a, b) => {
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

  const handleStartAudioService = async () => {
    setIsStartingService(true);
    setServiceError(null);
    
    try {
      console.log('🚀 Starting audio service from app...');
      setAudioServiceStatus('connecting');
      
      const result = await startAudioServiceFromApp();
      console.log('✅ Service start result:', result);
      
      // Update status
      setAudioServiceStatus('connected');
      
      // Get initial memory usage
      const usage = await getMemoryUsage();
      setMemoryUsage(usage);
      
      // Start memory monitoring
      startMemoryMonitoring(10000);
      
    } catch (error) {
      console.error('❌ Failed to start audio service:', error);
      setAudioServiceStatus('error');
      setServiceError(error.message);
    } finally {
      setIsStartingService(false);
    }
  };

  const handleTranspose = async (semitones) => {
    if (!currentDirectory) {
      console.error('No directory loaded to transpose');
      alert('Please load audio files first before transposing');
      return;
    }

    if (allTracks.length === 0) {
      console.error('No tracks loaded');
      alert('No tracks loaded to transpose');
      return;
    }

    console.log(`🎵 Starting transposition: ${semitones} semitones`);
    setIsTransposeModalOpen(true);
    setTransposeProgress({
      currentFile: '',
      totalFiles: 0,
      completedFiles: 0,
      message: 'Starting transposition...',
    });

    try {
      // Call the Rust command to transpose files
      const outputDir = await core.invoke('transpose_audio_files', {
        directory: currentDirectory,
        semitones: semitones,
      });

      console.log('✅ Transposition complete! Output directory:', outputDir);
      
      // Stop current audio and clear tracks
      stopAllAudio();
      await clearTracks();
      
      // Load the new transposed tracks
      console.log('🔄 Loading transposed tracks from:', outputDir);
      
      // Read the new directory to get track paths
      const entries = await fs.readDir(outputDir, { recursive: false });
      const audioFiles = entries
        .filter(e => e.children === undefined && (
          e.name.endsWith('.mp3') || 
          e.name.endsWith('.wav') || 
          e.name.endsWith('.ogg') ||
          e.name.endsWith('.m4a') ||
          e.name.endsWith('.flac')
        ))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const trackPaths = audioFiles.map(f => `${outputDir}/${f.name}`);
      
      // Add the new tracks as a song
      const results = await addTracks(trackPaths);
      
      // Update the tracks in the UI
      const loadedTracks = results
        .filter(result => result.success)
        .map((result, index) => {
          // Use the track name from the backend response
          const trackName = result.name || path.basename(result.path, path.extname(result.path));
          return {
            id: result.trackId,
            path: result.path,
            name: trackName,
            pan: 0,
            isMuted: false,
            isPlaying: false,
            individualVolume: 0.7,
          };
        });
      
      // Emit event to update tracks in parent component
      event.emit('tracks-updated', loadedTracks);
      
      // Update current directory
      setCurrentDirectory(outputDir);
      
      setTransposeProgress(prev => ({
        ...prev,
        message: 'Transposition complete! New tracks loaded.',
      }));
      
    } catch (error) {
      console.error('❌ Failed to transpose audio files:', error);
      setTransposeProgress(prev => ({
        ...prev,
        message: `Error: ${error}`,
      }));
      alert(`Failed to transpose audio files: ${error}`);
    }
  };

  const handleTransposeUp = () => handleTranspose(1);
  const handleTransposeDown = () => handleTranspose(-1);

  const handleCloseTransposeModal = () => {
    setIsTransposeModalOpen(false);
    setTransposeProgress({
      currentFile: '',
      totalFiles: 0,
      completedFiles: 0,
      message: '',
    });
  };

  return (
    <div id="multitrack-player" className="bg-stage text-primary h-full flex flex-col">
      {/* Audio Service Status Bar */}
      <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-gray-700 bg-opacity-50 rounded text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            audioServiceStatus === 'connected' ? 'bg-green-500' : 
            audioServiceStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`}></span>
          <span className={`${
            audioServiceStatus === 'connected' ? 'text-green-300' : 
            audioServiceStatus === 'connecting' ? 'text-yellow-300' : 'text-red-300'
          }`}>
            {audioServiceStatus === 'connected' ? '✓ Audio Ready' : 
             audioServiceStatus === 'connecting' ? '⟳ Connecting' : '✕ Error'}
          </span>
        </div>
        <div className="text-gray-400">
          {allTracks.length > 0 && <span>{allTracks.length} tracks</span>}
          {memoryUsage && <span className="ml-3">Mem: {(memoryUsage.rss / 1024 / 1024).toFixed(0)}MB</span>}
        </div>
      </div>

      {/* Service Error Message */}
      {audioServiceStatus === 'error' && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            🎵 Audio Service Required
          </div>
          <div className="text-xs text-red-600 dark:text-red-300 mb-3">
            {serviceError || 'The Node.js audio service is not running.'}
          </div>
          
          {/* Start Service Button */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleStartAudioService}
              disabled={isStartingService}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isStartingService 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RocketLaunchIcon className={`w-4 h-4 ${isStartingService ? 'animate-spin' : ''}`} />
              {isStartingService ? 'Starting Service...' : 'Start Audio Service'}
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
            onClick={handlePlayAll}
            disabled={isOperationInProgress || allTracks.length === 0}
          >
            <PlayIcon className="w-5 h-5" />
          </button>

          <button 
            aria-label="Stop all tracks" 
            title="Stop All" 
            className="p-2.5 bg-red-700 hover:bg-red-600 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm" 
            onClick={handleStopAll}
            disabled={isOperationInProgress}
          >
            <PauseIcon className="w-5 h-5" />
          </button>

          <button 
            aria-label="Restart all tracks" 
            title="Start From Beginning" 
            className="p-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm" 
            onClick={handleGoToBeginning}
            disabled={isOperationInProgress || allTracks.length === 0}
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
            onClick={handleTransposeDown}
            disabled={allTracks.length === 0 || !currentDirectory}
          >
            <ArrowDownIcon className="w-4 h-4" />
          </button>
          <button 
            aria-label="Transpose up" 
            title="Transpose Up (+1)" 
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            onClick={handleTransposeUp}
            disabled={allTracks.length === 0 || !currentDirectory}
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
            value={globalVolume}
            onChange={handleVolumeChange}
            className="w-24 sm:w-28 md:w-32 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <span className="text-xs text-gray-400 w-6 text-right font-medium">{Math.round(globalVolume * 100)}%</span>
        </div>
      </div>

      {/* Transpose Modal */}
      <TransposeModal
        isOpen={isTransposeModalOpen}
        currentFile={transposeProgress.currentFile}
        totalFiles={transposeProgress.totalFiles}
        completedFiles={transposeProgress.completedFiles}
        message={transposeProgress.message}
        onClose={handleCloseTransposeModal}
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
            {allTracks.sort(sortTracks).map((track, index) => (
              <TrackControl
                key={index}
                track={track}
                onMuteToggle={handleMuteToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultitrackPlayer;
