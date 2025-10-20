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
  checkAudioServiceStatusFromApp
} from '../../utils/audio';
import TrackControl from './TrackControl.jsx';
import { PlayIcon, PauseIcon, BackwardIcon, RocketLaunchIcon } from '@heroicons/react/24/solid';

const MultitrackPlayer = ({ allTracks, isLoadingTracks }) => {
  const [globalVolume, setGlobalVolumeState] = useState(1);
  const [audioServiceStatus, setAudioServiceStatus] = useState('connecting');
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  const [isStartingService, setIsStartingService] = useState(false);

  // Initialize audio service on component mount
  useEffect(() => {
    console.log('[MultitrackPlayer] allTracks prop:', allTracks);
    
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
  }, []);

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
