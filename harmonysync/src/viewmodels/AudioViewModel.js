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

  constructor(audioService) {
    this.audioService = audioService;
    makeAutoObservable(this);
    this._setupListeners();
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

  // Private helpers
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default AudioViewModel;
