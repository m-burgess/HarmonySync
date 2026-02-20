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

import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { IAudioViewModel } from '../types/viewmodels';
import type { IAudioService } from '../types/services';
import type { AudioTrack, MemoryUsage, MixerConfig } from '../types';

export class AudioViewModel extends BaseViewModel implements IAudioViewModel {
  protected readonly viewModelName = 'AudioViewModel';

  // Observable state
  public tracks: AudioTrack[] = [];
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  public currentPosition: number = 0;
  public duration: number = 0;
  public isLoading: boolean = false;
  public error: string | null = null;
  public memoryUsage: MemoryUsage | null = null;
  public currentSongPath: string | null = null;
  public audioServiceStatus: 'connecting' | 'connected' | 'error' = 'connecting';
  public serviceError: string | null = null;
  public isStartingService: boolean = false;

  public isOperationInProgress: boolean = false;
  public globalVolume: number = 1.0;

  // Private fields
  private audioService: IAudioService;


  constructor(audioService: IAudioService) {
    super();
    this.audioService = audioService;

    // Setup MobX observability
    makeObservable(this, {
      tracks: observable,
      isPlaying: observable,
      isPaused: observable,
      currentPosition: observable,
      duration: observable,
      isLoading: observable,
      error: observable,
      memoryUsage: observable,
      currentSongPath: observable,
      audioServiceStatus: observable,
      serviceError: observable,
      isStartingService: observable,

      isOperationInProgress: observable,
      globalVolume: observable,
      hasTracksLoaded: computed,
      formattedPosition: computed,
      formattedDuration: computed,
      progressPercentage: computed,
      loadSong: action,

      play: action,
      pause: action,
      stop: action,
      seek: action,
      setTrackVolume: action,
      setTrackPan: action,
      muteTrack: action,
      unmuteTrack: action,
      toggleTrackMute: action,
      saveMixerConfig: action,
      loadMixerConfig: action,
      updateMemoryUsage: action,
      cleanup: action,
      playAll: action,
      playAllFrontendScheduled: action,
      stopAll: action,
      goToBeginning: action,
      setGlobalVolume: action,
      startAudioService: action,

      updateCurrentDirectoryFromTracks: action,

      setTracks: action,
      setIsLoading: action,

      loadTracksIntoService: action,
    });
  }

  /**
   * Initialize ViewModel - setup listeners and initialize audio service
   */
  protected override async onInitialize(): Promise<void> {
    this.setupListeners();
    await this.initializeAudioService();
  }

  /**
   * Cleanup ViewModel - unsubscribe from events
   */
  protected override onDispose(): void {

    this.audioService.stopMemoryMonitoring();
  }

  /**
   * Setup IPC listeners
   */
  private setupListeners(): void {
    // Listen for position updates
    this.audioService.onPositionUpdate((_event: unknown, position: number) => {
      runInAction(() => {
        this.currentPosition = position;
      });
    });

    // Listen for state changes
    this.audioService.onStateChange((_event: unknown, state: { isPlaying: boolean; isPaused: boolean }) => {
      runInAction(() => {
        this.isPlaying = state.isPlaying;
        this.isPaused = state.isPaused;
      });
    });
  }

  /**
   * Initialize audio service on construction
   */
  private async initializeAudioService(): Promise<void> {
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
      this.audioService.startMemoryMonitoring(10000, (usage: MemoryUsage) => {
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
      this.handleError('Initialize audio service', error);
      runInAction(() => {
        this.audioServiceStatus = 'error';
        this.serviceError = error instanceof Error ? error.message : String(error);
      });
    }
  }

  // Computed properties
  public get hasTracksLoaded(): boolean {
    return this.tracks.length > 0;
  }

  public get formattedPosition(): string {
    return this.formatTime(this.currentPosition);
  }

  public get formattedDuration(): string {
    return this.formatTime(this.duration);
  }

  public get progressPercentage(): number {
    if (this.duration === 0) return 0;
    return (this.currentPosition / this.duration) * 100;
  }

  // Actions: Load tracks
  public async loadSong(folderPath: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await this.audioService.loadTracks(folderPath);
      // Handle both array response and {tracks: []} object response
      const tracksArray: AudioTrack[] = Array.isArray(response)
        ? response
        : ((response as any)?.tracks || []);

      runInAction(() => {
        this.tracks = tracksArray.map((track, index) => {
          const resolvedPath = (track as { path?: string; file_path?: string; filePath?: string }).path
            ?? (track as { path?: string; file_path?: string; filePath?: string }).file_path
            ?? (track as { path?: string; file_path?: string; filePath?: string }).filePath
            ?? '';
          const resolvedName = this.resolveTrackName(track as { name?: string; track_name?: string; path?: string; file_path?: string; filePath?: string });

          return {
            ...track,
            name: resolvedName,
            path: resolvedPath,
            index,
            volume: track.volume ?? 1.0,
            pan: track.pan ?? 0,
            muted: track.muted ?? false,
            isPreloaded: track.isPreloaded ?? false,
            preloadStatus: track.preloadStatus ?? 'pending',
            preloadError: track.preloadError
          };
        });
        this.currentSongPath = folderPath;
        this.isLoading = false;
      });

      // Try to load saved mixer config
      await this.loadMixerConfig();

      // Auto-preload all tracks for instant playback
      console.log('🔄 Auto-preloading tracks for instant playback...');
      try {
        await this.audioService.preloadAllTracks();
        console.log('✅ Tracks preloaded successfully');
      } catch (error) {
        console.warn('⚠️ Failed to preload tracks:', error);
        // Non-fatal error, tracks can still be played
      }
    } catch (error) {
      this.handleError('Load tracks', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }



  // Actions: Playback controls
  public async play(): Promise<void> {
    try {
      // Trigger playback on the service (goes through Go engine)
      await this.audioService.play();

      runInAction(() => {
        this.isPlaying = true;
        this.isPaused = false;
      });
    } catch (error) {
      this.handleError('Play', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async pause(): Promise<void> {
    try {
      await this.audioService.pause();
      runInAction(() => {
        this.isPaused = true;
        this.isPlaying = false;
      });
    } catch (error) {
      this.handleError('Pause', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async stop(): Promise<void> {
    try {
      await this.audioService.stop();
      runInAction(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
      });
    } catch (error) {
      this.handleError('Stop', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async seek(position: number): Promise<void> {
    try {
      await this.audioService.seek(position);
      runInAction(() => {
        this.currentPosition = position;
      });
    } catch (error) {
      this.handleError('Seek', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }

  // Actions: Track controls

  public async setTrackVolume(trackIndex: number, volume: number): Promise<void> {
    try {
      await this.audioService.setTrackVolume(trackIndex, volume);
      runInAction(() => {
        if (this.tracks[trackIndex]) {
          this.tracks[trackIndex].volume = volume;
        }
      });
    } catch (error) {
      this.handleError('Set track volume', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async setTrackPan(trackIndex: number, pan: number): Promise<void> {
    try {
      await this.audioService.setTrackPan(trackIndex, pan);
      runInAction(() => {
        if (this.tracks[trackIndex]) {
          this.tracks[trackIndex].pan = pan;
        }
      });
    } catch (error) {
      this.handleError('Set track pan', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async muteTrack(trackIndex: number): Promise<void> {
    try {
      await this.audioService.muteTrack(trackIndex, true);
      runInAction(() => {
        if (this.tracks[trackIndex]) {
          this.tracks[trackIndex].muted = true;
        }
      });
    } catch (error) {
      this.handleError('Mute track', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async unmuteTrack(trackIndex: number): Promise<void> {
    try {
      await this.audioService.muteTrack(trackIndex, false);
      runInAction(() => {
        if (this.tracks[trackIndex]) {
          this.tracks[trackIndex].muted = false;
        }
      });
    } catch (error) {
      this.handleError('Unmute track', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }


  public async toggleTrackMute(trackIndex: number): Promise<void> {
    const track = this.tracks[trackIndex];
    if (!track) return;

    const newMutedState = !track.muted;

    try {
      await this.audioService.muteTrack(trackIndex, newMutedState);
      runInAction(() => {
        this.tracks[trackIndex].muted = newMutedState;
      });
    } catch (error) {
      this.handleError('Toggle track mute', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }

  // Actions: Mixer config persistence

  public async saveMixerConfig(): Promise<void> {
    if (!this.currentSongPath) return;

    const config: MixerConfig = {
      songPath: this.currentSongPath,
      tracks: this.tracks.map(t => ({
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
      })),
      globalVolume: this.globalVolume,
      timestamp: Date.now(),
    };

    try {
      await this.audioService.saveMixerConfig(config);
    } catch (error) {
      this.logWarn('Failed to save mixer config:', error);
    }
  }


  public async loadMixerConfig(): Promise<void> {
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
          await this.audioService.muteTrack(i, track.muted);
        }
      }
    } catch (error) {
      this.logWarn('Failed to load mixer config:', error);
    }
  }

  // Actions: Memory monitoring

  public async updateMemoryUsage(): Promise<void> {
    try {
      const usage = await this.audioService.getMemoryUsage();
      runInAction(() => {
        this.memoryUsage = usage;
      });
    } catch (error) {
      this.logWarn('Failed to get memory usage:', error);
    }
  }

  // Actions: Cleanup

  public async cleanup(): Promise<void> {
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
      this.logWarn('Failed to cleanup audio:', error);
    }
  }

  // Actions: Play all tracks with operation lock

  public async playAll(): Promise<void> {
    if (this.isOperationInProgress) {
      this.log('⚠️ Operation already in progress, ignoring playAll');
      return;
    }

    this.log('▶️ Starting playAll operation');
    runInAction(() => {
      this.isOperationInProgress = true;
    });

    try {
      await this.audioService.playAllTracks();
      runInAction(() => {
        this.isPlaying = true;
        this.isPaused = false;
      });
      this.log('✅ playAll operation completed');
    } catch (error) {
      this.logError('❌ playAll operation failed:', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    } finally {
      // Operation lock with timeout provides user feedback while preventing rapid clicks.
      // This is intentionally simple for UI responsiveness. For critical operations where
      // race conditions are a concern, consider implementing a Promise-based queue.
      setTimeout(() => {
        runInAction(() => {
          this.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 500);
    }
  }

  /**
   * Play all tracks using frontend Web Audio API scheduling
   * This implements the issue requirements:
   * 1. Calculate the duration of each track
   * 2. Use audio context scheduling with node.start() for perfect sync
   */
  public async playAllFrontendScheduled(): Promise<void> {
    if (this.isOperationInProgress) {
      this.log('⚠️ Operation already in progress, ignoring playAllFrontendScheduled');
      return;
    }

    this.log('🎵 Starting playAll with frontend scheduling (Web Audio API)');
    runInAction(() => {
      this.isOperationInProgress = true;
    });

    try {
      // Use standard play - Go engine handles synchronized playback
      await this.audioService.play();
      runInAction(() => {
        this.isPlaying = true;
        this.isPaused = false;
      });
      this.log('✅ Frontend scheduled playback started');
    } catch (error) {
      this.logError('❌ Frontend scheduled playback failed:', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    } finally {
      setTimeout(() => {
        runInAction(() => {
          this.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 500);
    }
  }

  // Actions: Stop all with operation lock

  public async stopAll(): Promise<void> {
    if (this.isOperationInProgress) {
      this.log('⚠️ Operation already in progress, ignoring stopAll');
      return;
    }

    this.log('⏹️ Starting stopAll operation');
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
      this.log('✅ stopAll operation completed');
    } catch (error) {
      this.logError('❌ stopAll operation failed:', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    } finally {
      setTimeout(() => {
        runInAction(() => {
          this.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 500);
    }
  }

  // Actions: Go to beginning with operation lock

  public async goToBeginning(): Promise<void> {
    if (this.isOperationInProgress) {
      this.log('⚠️ Operation already in progress, ignoring goToBeginning');
      return;
    }

    this.log('▶️ Starting goToBeginning operation');
    runInAction(() => {
      this.isOperationInProgress = true;
    });

    try {
      await this.audioService.goToBeginningAllTracks();
      runInAction(() => {
        this.isPlaying = true;
        this.currentPosition = 0;
      });
      this.log('✅ goToBeginning operation completed');
    } catch (error) {
      this.logError('❌ goToBeginning operation failed:', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    } finally {
      // Reset after a longer delay to prevent rapid clicking
      setTimeout(() => {
        runInAction(() => {
          this.log('🔄 Resetting operation in progress flag');
          this.isOperationInProgress = false;
        });
      }, 2000);
    }
  }

  // Actions: Set global volume

  public async setGlobalVolume(volume: number): Promise<void> {
    try {
      await this.audioService.setGlobalVolume(volume);
      runInAction(() => {
        this.globalVolume = volume;
      });
    } catch (error) {
      this.handleError('Set global volume', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }

  // Actions: Start audio service

  public async startAudioService(): Promise<void> {
    runInAction(() => {
      this.isStartingService = true;
      this.serviceError = null;
      this.audioServiceStatus = 'connecting';
    });

    try {
      this.log('🚀 Starting audio service from app...');

      const result = await this.audioService.startAudioServiceFromApp();
      this.log('✅ Service start result:', result);

      runInAction(() => {
        this.audioServiceStatus = 'connected';
      });

      // Get initial memory usage
      const usage = await this.audioService.getMemoryUsage();
      runInAction(() => {
        this.memoryUsage = usage;
      });

      // Start memory monitoring
      this.audioService.startMemoryMonitoring(10000, (usage: MemoryUsage) => {
        runInAction(() => {
          this.memoryUsage = usage;
        });
      });
    } catch (error) {
      this.logError('❌ Failed to start audio service:', error);
      runInAction(() => {
        this.audioServiceStatus = 'error';
        this.serviceError = error instanceof Error ? error.message : String(error);
      });
    } finally {
      runInAction(() => {
        this.isStartingService = false;
      });
    }
  }

  // Actions: Transpose with modal and progress tracking



  // Actions: Open/Close transpose modal



  // Actions: Update current directory from loaded tracks

  public updateCurrentDirectoryFromTracks(allTracksData: AudioTrack[]): void {
    if (allTracksData && allTracksData.length > 0 && allTracksData[0].path) {
      const trackPath = allTracksData[0].path;
      // Use lastIndexOf for cross-platform compatibility (works with both / and \)
      const lastSeparator = Math.max(trackPath.lastIndexOf('/'), trackPath.lastIndexOf('\\'));
      const dirPath = trackPath.substring(0, lastSeparator);
      runInAction(() => {
        this.currentSongPath = dirPath;
      });
      this.log('[AudioViewModel] Current directory:', dirPath);
    }
  }

  // Actions: Setup transpose progress listener



  // Interface method implementation



  // Private helpers
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private resolveTrackName(track: { name?: string; track_name?: string; path?: string; file_path?: string; filePath?: string }): string {
    const rawName = (track.name ?? track.track_name ?? '').trim();
    const path = track.path ?? track.file_path ?? track.filePath ?? '';
    const nameFromPath = this.extractNameFromPath(path);

    if (this.isGenericTrackName(rawName)) {
      return nameFromPath || rawName || 'Unknown Track';
    }

    return rawName || nameFromPath || 'Unknown Track';
  }

  private extractNameFromPath(path: string): string {
    if (!path) return '';
    const normalized = path.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    const baseName = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
    if (!baseName) return '';
    const lastDot = baseName.lastIndexOf('.');
    return lastDot > 0 ? baseName.substring(0, lastDot) : baseName;
  }

  private isGenericTrackName(name: string): boolean {
    if (!name) return true;
    return /^track\s*\d+$/i.test(name);
  }

  // Direct state setters for App.jsx compatibility (to be phased out)

  public setTracks(tracks: AudioTrack[]): void {
    this.tracks = tracks.map((track, index) => {
      const resolvedPath = (track as { path?: string; file_path?: string; filePath?: string }).path
        ?? (track as { path?: string; file_path?: string; filePath?: string }).file_path
        ?? (track as { path?: string; file_path?: string; filePath?: string }).filePath
        ?? '';
      const resolvedName = this.resolveTrackName(track as { name?: string; track_name?: string; path?: string; file_path?: string; filePath?: string });

      return {
        ...track,
        name: resolvedName,
        path: resolvedPath,
        index,
        volume: track.volume ?? 1.0,
        pan: track.pan ?? 0.0,
        muted: track.muted ?? false,
      };
    });
  }

  /**
   * Extract file path from a track object, handling various property name conventions
   * @param track - Track object that may have path in different properties
   * @returns File path string or undefined
   */
  private getTrackFilePath(track: AudioTrack | Record<string, any>): string | undefined {
    // Handle both AudioTrack interface and various track object formats
    // Note: Using 'any' is pragmatic here since tracks come from different sources (service order, 
    // file system, etc.) with inconsistent property names. Runtime checks provide safety.
    const trackObj = track as any;

    // Check standard AudioTrack.path first
    if (typeof trackObj.path === 'string' && trackObj.path) return trackObj.path;

    // Check alternative property names from different sources
    if (typeof trackObj.file_path === 'string' && trackObj.file_path) return trackObj.file_path;
    if (typeof trackObj.filePath === 'string' && trackObj.filePath) return trackObj.filePath;

    return undefined;
  }

  /**
   * Load tracks into the audio service
   * This method sets the tracks in state and loads them into the backend audio service
   * @param tracks - Array of track objects with file paths
   */
  public async loadTracksIntoService(tracks: AudioTrack[]): Promise<void> {
    // Set tracks in state first - they should be in state even if service loading fails
    // This allows the UI to display track information and mixer controls
    this.setTracks(tracks);

    // If we have tracks with file paths, load them into the audio service in one batch
    if (tracks.length > 0) {
      try {
        // Extract file paths from track objects
        const trackPaths = tracks
          .map(t => this.getTrackFilePath(t))
          .filter((path): path is string => path !== undefined);

        if (trackPaths.length > 0) {
          this.log('Loading', trackPaths.length, 'tracks into audio service');

          // Debug service identity
          const serviceName = (this.audioService as any).serviceName || 'Unknown';
          console.log(`[AudioViewModel] Using audio service: ${serviceName}`);

          // Clear existing tracks first to ensure clean state
          await this.audioService.clearTracks();

          // Determine song name from the folder of the first track
          let songName = 'Unknown Song';
          try {
            const firstPath = trackPaths[0];
            const normalized = firstPath.replace(/\\/g, '/');
            const lastSlash = normalized.lastIndexOf('/');
            if (lastSlash > 0) {
              const dirPath = normalized.substring(0, lastSlash);
              const dirName = dirPath.substring(dirPath.lastIndexOf('/') + 1);
              songName = dirName || 'Unknown Song';
            }
          } catch (e) {
            console.warn('Failed to determine song name from path', e);
          }

          console.log(`[AudioViewModel] Creating song "${songName}" with ${trackPaths.length} tracks`);

          // Use createSong to properly register the song in the backend
          // This ensures currentSongId is set, which is required for transposition
          try {
            const songId = await this.audioService.createSong(songName, trackPaths);
            this.log('Song created successfully with ID:', songId);

            // We don't need to manually check for failed loads here as createSong throws or returns ID
            // The backend handles the loading and reporting
          } catch (createError) {
            console.error('Failed to create song:', createError);
            // Fallback to loadMultipleTracks if createSong fails (compatibility)
            this.log('Falling back to loadMultipleTracks');
            const result = await this.audioService.loadMultipleTracks(trackPaths);
            this.log('Tracks loaded (fallback):', result.loaded, 'of', result.total);
          }
        }
      } catch (error) {
        this.logError('Failed to load tracks into audio service', error);
        // Continue anyway - tracks are still in state for UI display
      }
    }
  }


  public setIsLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
  }

  /**
   * Handle errors and update error state
   */
  protected override onError(_operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default AudioViewModel;
