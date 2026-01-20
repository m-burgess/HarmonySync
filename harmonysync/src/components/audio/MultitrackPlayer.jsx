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
  
  // Transpose modal state
  const [isTransposeModalOpen, setIsTransposeModalOpen] = useState(false);
  const [transposeProgress, setTransposeProgress] = useState({
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0,
    message: '',
  });

  // Initialize audio service on component mount
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
        unlisten.then(fn => fn());
      }
    };
  }, []);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setGlobalVolumeState(newVolume);
    setGlobalVolume(newVolume); // Assuming setGlobalVolume exists in audio.js
  };

  const handlePanChange = (track, newPanValue) => {
    console.log(`🎛️  Pan updated for track ${track.name}: ${newPanValue}`);
    // Update track in allTracks state
    const updatedTracks = allTracks.map(t => 
      t.id === track.id ? { ...t, panValue: newPanValue } : t
    );
    // Note: We don't call setAllTracks here as it's managed by the parent (App.jsx)
    // The audio service call is handled in TrackControl
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
      
      // Add the new tracks
      const results = await addTracks(trackPaths);
      
      // Update the tracks in the UI
      const loadedTracks = results
        .filter(result => result.success)
        .map((result, index) => {
          const audioFile = audioFiles.find(f => `${outputDir}/${f.name}` === result.path);
          return {
            id: result.trackId,
            path: result.path,
            name: audioFile?.name || 'Unknown Track',
            panValue: 0,
            isMuted: false,
            isPlaying: false,
            individualVolume: 0.7,
          };
        });
      
      // Emit event to update tracks in parent component
      // Since we can't directly call setAllTracks from parent, we'll emit an event
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
    <div id="multitrack-player" className="bg-stage text-primary p-3 rounded-md">
      {/* Audio Service Status */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            audioServiceStatus === 'connected' ? 'bg-green-500' : 
            audioServiceStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`}></span>
          <span className="text-muted">
            Audio Service: {audioServiceStatus === 'connected' ? 'Connected' : 
                           audioServiceStatus === 'connecting' ? 'Connecting...' : 'Error'}
          </span>
        </div>
        {memoryUsage && (
          <div className="text-muted">
            Memory: {memoryUsage.formatted?.total || `${(memoryUsage.rss / 1024 / 1024).toFixed(1)}MB`}
          </div>
        )}
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

      <div className="flex items-center gap-3 mb-3">
        <button aria-label="Play all tracks" title="Play All" className="p-2 bg-stage rounded-md text-primary" onClick={playAllTracks}>
          <PlayIcon className="w-5 h-5 text-primary" />
        </button>

        <button aria-label="Stop all tracks" title="Stop All" className="p-2 bg-surface rounded-md text-muted" onClick={stopAllAudio}>
          <PauseIcon className="w-5 h-5 text-primary" />
        </button>

        <button aria-label="Restart all tracks" title="Start From Beginning" className="p-2 bg-surface rounded-md text-muted" onClick={goToBeginningAllTracks}>
          <BackwardIcon className="w-5 h-5 text-primary" />
        </button>

        {/* Transpose buttons */}
        <div className="flex items-center gap-1 ml-3">
          <button 
            aria-label="Transpose up" 
            title="Transpose Up (1 semitone)" 
            className="p-2 bg-green-700 hover:bg-green-600 rounded-md text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            onClick={handleTransposeUp}
            disabled={allTracks.length === 0 || !currentDirectory}
          >
            <ArrowUpIcon className="w-5 h-5" />
          </button>

          <button 
            aria-label="Transpose down" 
            title="Transpose Down (1 semitone)" 
            className="p-2 bg-red-700 hover:bg-red-600 rounded-md text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            onClick={handleTransposeDown}
            disabled={allTracks.length === 0 || !currentDirectory}
          >
            <ArrowDownIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="range"
            id="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={globalVolume}
            onChange={handleVolumeChange}
            className="w-36"
          />
          <label htmlFor="volume-slider" className="text-sm text-muted">Volume</label>
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-0.5 overflow-auto" id="track-controls">
          {allTracks.sort(sortTracks).map((track, index) => (
            <div key={index} className="bg-surface rounded">
              <TrackControl
                track={track}
                onPanChange={handlePanChange}
                onMuteToggle={handleMuteToggle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultitrackPlayer;
