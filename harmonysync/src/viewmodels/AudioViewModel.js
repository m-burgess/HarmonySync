/**
 * Audio ViewModel - Presentation logic for audio player
 * 
 * This ViewModel manages the state and business logic for the multitrack audio player.
 * It uses MobX for reactive state management and delegates IPC calls to AudioService.
 * 
 * Key responsibilities:
 * - Manage playback state (playing, paused, stopped)
 * - Manage track list and track states (volume, pan, mute)
 * - Handle playback controls (play, pause, stop, seek)
 * - Handle transpose operations
 * - Persist mixer configurations
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */
import { makeAutoObservable, runInAction } from 'mobx';

class AudioViewModel {
  // Observable state
  tracks = [];
  isPlaying = false;
  isPaused = false;
  currentPosition = 0;
  duration = 0;
  isLoading = false;
  error = null;
  memoryUsage = null;
  currentSongPath = null;
  
  // Audio service status
  audioServiceStatus = 'connecting'; // 'connecting' | 'connected' | 'error'
  serviceError = null;
  isStartingService = false;
  
  // Transpose modal state
  isTransposeModalOpen = false;
  transposeProgress = {
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0,
    message: '',
  };
  
  // Operation lock to prevent concurrent operations
  isOperationInProgress = false;
  
  // Global volume
  globalVolume = 1.0;

  constructor(audioService) {
    this.audioService = audioService;
    makeAutoObservable(this);
    this._setupListeners();
    this._initializeAudioService();
  }

  // Private: Initialize audio service on construction
  async _initializeAudioService() {
    try {
      runInAction(() => {
        this.audioServiceStatus = 'connecting';
        this.serviceError = null;
      });
      
      await this.audioService.initializeAudioService();
      
      runInAction(() => {
        this.audioServiceStatus = 'connected';
      });
      
      // Start memory monitoring
      this.audioService.startMemoryMonitoring(10000, (usage) => {
        runInAction(() => {
          this.memoryUsage = usage;
        });
      });
      
      // Get initial memory usage
      const usage = await this.audioService.getMemoryUsage();
      runInAction(() => {
        this.memoryUsage = usage;
      });
      
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      runInAction(() => {
        this.audioServiceStatus = 'error';
        this.serviceError = error.message;
      });
    }
  }

  // Private: Setup IPC listeners
  _setupListeners() {
    // Listen for position updates
    this.audioService.onPositionUpdate((event, position) => {
      runInAction(() => {
        this.currentPosition = position;
      });
    });

    // Listen for state changes
    this.audioService.onStateChange((event, state) => {
      runInAction(() => {
        this.isPlaying = state.isPlaying;
        this.isPaused = state.isPaused;
      });
    });
  }

  // Computed properties
  get hasTracksLoaded() {
    return this.tracks.length > 0;
  }

  get formattedPosition() {
    return this._formatTime(this.currentPosition);
  }

  get formattedDuration() {
    return this._formatTime(this.duration);
  }

  get progressPercentage() {
    if (this.duration === 0) return 0;
    return (this.currentPosition / this.duration) * 100;
  }

  // Actions: Load tracks
  async loadTracks(folderPath) {
    this.isLoading = true;
    this.error = null;
    
    try {
      const tracks = await this.audioService.loadTracks(folderPath);
      
      runInAction(() => {
        this.tracks = tracks.map((track, index) => ({
          ...track,
          index,
          volume: 1.0,
          pan: 0,
          muted: false
        }));
        this.currentSongPath = folderPath;
        this.isLoading = false;
      });

      // Try to load saved mixer config
      await this.loadMixerConfig();
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }

  // Actions: Transpose
  async transpose(semitones) {
    if (!this.currentSongPath) {
      this.error = 'No song loaded';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.audioService.transpose(this.currentSongPath, semitones);
      
      if (result.success) {
        // Reload tracks from transposed folder
        await this.loadTracks(result.outputPath);
      } else {
        runInAction(() => {
          this.error = 'Transpose failed';
          this.isLoading = false;
        });
      }
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }

  // Actions: Playback controls
  async play() {
    try {
      await this.audioService.play();
      runInAction(() => {
        this.isPlaying = true;
        this.isPaused = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async pause() {
    try {
      await this.audioService.pause();
      runInAction(() => {
        this.isPaused = true;
        this.isPlaying = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async stop() {
    try {
      await this.audioService.stop();
      runInAction(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async seek(position) {
    try {
      await this.audioService.seek(position);
      runInAction(() => {
        this.currentPosition = position;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  // Actions: Track controls
  async setTrackVolume(trackIndex, volume) {
    try {
      await this.audioService.setTrackVolume(trackIndex, volume);
      runInAction(() => {
        this.tracks[trackIndex].volume = volume;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async setTrackPan(trackIndex, pan) {
    try {
      await this.audioService.setTrackPan(trackIndex, pan);
      runInAction(() => {
        this.tracks[trackIndex].pan = pan;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async toggleTrackMute(trackIndex) {
    const track = this.tracks[trackIndex];
    const newMutedState = !track.muted;

    try {
      await this.audioService.setTrackMute(trackIndex, newMutedState);
      runInAction(() => {
        this.tracks[trackIndex].muted = newMutedState;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  // Actions: Mixer config persistence
  async saveMixerConfig() {
    if (!this.currentSongPath) return;

    const config = {
      tracks: this.tracks.map(t => ({
        volume: t.volume,
        pan: t.pan,
        muted: t.muted
      }))
    };

    try {
      await this.audioService.saveMixerConfig(this.currentSongPath, config);
    } catch (error) {
      console.warn('Failed to save mixer config:', error);
    }
  }

  async loadMixerConfig() {
    if (!this.currentSongPath) return;

    try {
      const config = await this.audioService.loadMixerConfig(this.currentSongPath);
      
      if (config && config.tracks) {
        runInAction(() => {
          config.tracks.forEach((trackConfig, index) => {
            if (this.tracks[index]) {
              this.tracks[index].volume = trackConfig.volume;
              this.tracks[index].pan = trackConfig.pan;
              this.tracks[index].muted = trackConfig.muted;
            }
          });
        });

        // Apply loaded config to audio service
        for (let i = 0; i < this.tracks.length; i++) {
          const track = this.tracks[i];
          await this.audioService.setTrackVolume(i, track.volume);
          await this.audioService.setTrackPan(i, track.pan);
          await this.audioService.setTrackMute(i, track.muted);
        }
      }
    } catch (error) {
      console.warn('Failed to load mixer config:', error);
    }
  }

  // Actions: Memory monitoring
  async updateMemoryUsage() {
    try {
      const usage = await this.audioService.getMemoryUsage();
      runInAction(() => {
        this.memoryUsage = usage;
      });
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
    }
  }

  // Actions: Cleanup
  async cleanup() {
    try {
      await this.audioService.cleanup();
      runInAction(() => {
        this.tracks = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.duration = 0;
        this.currentSongPath = null;
      });
    } catch (error) {
      console.warn('Failed to cleanup audio:', error);
    }
  }

  // Actions: Play all tracks with operation lock
  async playAll() {
    if (this.isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring playAll');
      return;
    }
    
    console.log('▶️ Starting playAll operation');
    runInAction(() => {
      this.isOperationInProgress = true;
    });
    
    try {
      await this.audioService.playAllTracks();
      runInAction(() => {
        this.isPlaying = true;
        this.isPaused = false;
      });
      console.log('✅ playAll operation completed');
    } catch (error) {
      console.error('❌ playAll operation failed:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      // Operation lock with timeout provides user feedback while preventing rapid clicks.
      // This is intentionally simple for UI responsiveness. For critical operations where
      // race conditions are a concern, consider implementing a Promise-based queue.
      setTimeout(() => {
        runInAction(() => {
          console.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 500);
    }
  }

  // Actions: Stop all with operation lock
  async stopAll() {
    if (this.isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring stopAll');
      return;
    }
    
    console.log('⏹️ Starting stopAll operation');
    runInAction(() => {
      this.isOperationInProgress = true;
    });
    
    try {
      await this.audioService.stopAllAudio();
      runInAction(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
      });
      console.log('✅ stopAll operation completed');
    } catch (error) {
      console.error('❌ stopAll operation failed:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      setTimeout(() => {
        runInAction(() => {
          console.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 500);
    }
  }

  // Actions: Go to beginning with operation lock
  async goToBeginning() {
    if (this.isOperationInProgress) {
      console.log('⚠️ Operation already in progress, ignoring goToBeginning');
      return;
    }
    
    console.log('▶️ Starting goToBeginning operation');
    runInAction(() => {
      this.isOperationInProgress = true;
    });
    
    try {
      await this.audioService.goToBeginningAllTracks();
      runInAction(() => {
        this.isPlaying = true;
        this.currentPosition = 0;
      });
      console.log('✅ goToBeginning operation completed');
    } catch (error) {
      console.error('❌ goToBeginning operation failed:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      // Reset after a longer delay to prevent rapid clicking
      setTimeout(() => {
        runInAction(() => {
          console.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 2000);
    }
  }

  // Actions: Set global volume
  async setGlobalVolume(volume) {
    try {
      await this.audioService.setGlobalVolume(volume);
      runInAction(() => {
        this.globalVolume = volume;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  // Actions: Start audio service
  async startAudioService() {
    runInAction(() => {
      this.isStartingService = true;
      this.serviceError = null;
      this.audioServiceStatus = 'connecting';
    });
    
    try {
      console.log('🚀 Starting audio service from app...');
      
      const result = await this.audioService.startAudioServiceFromApp();
      console.log('✅ Service start result:', result);
      
      runInAction(() => {
        this.audioServiceStatus = 'connected';
      });
      
      // Get initial memory usage
      const usage = await this.audioService.getMemoryUsage();
      runInAction(() => {
        this.memoryUsage = usage;
      });
      
      // Start memory monitoring
      this.audioService.startMemoryMonitoring(10000, (usage) => {
        runInAction(() => {
          this.memoryUsage = usage;
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to start audio service:', error);
      runInAction(() => {
        this.audioServiceStatus = 'error';
        this.serviceError = error.message;
      });
    } finally {
      runInAction(() => {
        this.isStartingService = false;
      });
    }
  }

  // Actions: Transpose with modal and progress tracking
  async transposeAudio(semitones, currentDirectory, allTracksData) {
    if (!currentDirectory) {
      console.error('No directory loaded to transpose');
      runInAction(() => {
        this.error = 'Please load audio files first before transposing';
      });
      return;
    }

    if (!allTracksData || allTracksData.length === 0) {
      console.error('No tracks loaded');
      runInAction(() => {
        this.error = 'No tracks loaded to transpose';
      });
      return;
    }

    console.log(`🎵 Starting transposition: ${semitones} semitones`);
    
    runInAction(() => {
      this.isTransposeModalOpen = true;
      this.transposeProgress = {
        currentFile: '',
        totalFiles: 0,
        completedFiles: 0,
        message: 'Starting transposition...',
      };
    });

    try {
      // Import electron-adapter dynamically
      const { core, fs, event } = await import('../electron-adapter');
      
      // Call the Rust command to transpose files
      const outputDir = await core.invoke('transpose_audio_files', {
        directory: currentDirectory,
        semitones: semitones,
      });

      console.log('✅ Transposition complete! Output directory:', outputDir);
      
      // Stop current audio and clear tracks
      await this.audioService.stopAllAudio();
      await this.audioService.clearTracks();
      
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
      const results = await this.audioService.addTracks(trackPaths);
      
      // Update the tracks in the UI
      const loadedTracks = results
        .filter(result => result.success)
        .map((result, index) => {
          // Extract filename without extension using cross-platform string operations
          const path = result.path;
          const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
          const fileName = path.substring(lastSeparator + 1);
          const lastDot = fileName.lastIndexOf('.');
          const trackName = result.name || (lastDot > 0 ? fileName.substring(0, lastDot) : fileName);
          
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
      runInAction(() => {
        this.currentSongPath = outputDir;
        this.transposeProgress = {
          ...this.transposeProgress,
          message: 'Transposition complete! New tracks loaded.',
        };
      });
      
      return { success: true, outputDir, loadedTracks };
      
    } catch (error) {
      console.error('❌ Failed to transpose audio files:', error);
      runInAction(() => {
        this.transposeProgress = {
          ...this.transposeProgress,
          message: `Error: ${error}`,
        };
        this.error = `Failed to transpose audio files: ${error}`;
      });
      return { success: false, error: error.message };
    }
  }

  // Actions: Close transpose modal
  closeTransposeModal() {
    runInAction(() => {
      this.isTransposeModalOpen = false;
      this.transposeProgress = {
        currentFile: '',
        totalFiles: 0,
        completedFiles: 0,
        message: '',
      };
    });
  }

  // Actions: Update current directory from loaded tracks
  updateCurrentDirectoryFromTracks(allTracksData) {
    if (allTracksData && allTracksData.length > 0 && allTracksData[0].path) {
      const trackPath = allTracksData[0].path;
      // Use lastIndexOf for cross-platform compatibility (works with both / and \)
      const lastSeparator = Math.max(trackPath.lastIndexOf('/'), trackPath.lastIndexOf('\\'));
      const dirPath = trackPath.substring(0, lastSeparator);
      runInAction(() => {
        this.currentSongPath = dirPath;
      });
      console.log('[AudioViewModel] Current directory:', dirPath);
    }
  }

  // Actions: Setup transpose progress listener
  setupTransposeProgressListener() {
    // Import and setup listener asynchronously
    import('../electron-adapter').then(({ event }) => {
      event.listen('transpose-progress', (e) => {
        console.log('Transpose progress:', e.payload);
        runInAction(() => {
          this.transposeProgress = {
            currentFile: e.payload.current_file || '',
            totalFiles: e.payload.total_files || 0,
            completedFiles: e.payload.completed_files || 0,
            message: e.payload.message || '',
          };
        });
      }).then(unlisten => {
        // Store unlisten function for cleanup
        this._transposeUnlisten = unlisten;
      });
    });
  }

  // Cleanup transpose listener
  cleanupTransposeListener() {
    if (this._transposeUnlisten) {
      this._transposeUnlisten();
      this._transposeUnlisten = null;
    }
  }

  // Private helpers
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Direct state setters for App.jsx compatibility (to be phased out)
  setTracks(tracks) {
    this.tracks = tracks.map((track, index) => ({
      ...track,
      index,
      volume: track.volume ?? 1.0,
      pan: track.pan ?? 0.0,
      muted: track.muted ?? false,
    }));
  }

  setIsLoading(isLoading) {
    this.isLoading = isLoading;
  }
}

export default AudioViewModel;
