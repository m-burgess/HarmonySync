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
import type { AudioTrack, MemoryUsage, TransposeProgress, MixerConfig } from '../types';
import { initializeAudioService } from '../utils/audio/audio-nodejs';

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
  public isTransposeModalOpen: boolean = false;
  public transposeProgress: TransposeProgress = {
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0,
    message: '',
  };
  public isOperationInProgress: boolean = false;
  public globalVolume: number = 1.0;

  // Private fields
  private audioService: IAudioService;
  private transposeUnlisten: (() => void) | null = null;

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
      isTransposeModalOpen: observable,
      transposeProgress: observable,
      isOperationInProgress: observable,
      globalVolume: observable,
      hasTracksLoaded: computed,
      formattedPosition: computed,
      formattedDuration: computed,
      progressPercentage: computed,
      loadSong: action,
      transpose: action,
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
      stopAll: action,
      goToBeginning: action,
      setGlobalVolume: action,
      startAudioService: action,
      transposeAudio: action,
      openTransposeModal: action,
      closeTransposeModal: action,
      updateCurrentDirectoryFromTracks: action,
      setupTransposeProgressListener: action,
      cleanupTransposeListener: action,
      setTracks: action,
      setIsLoading: action,
      transposeAndLoad: action,
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
    this.cleanupTransposeListener();
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
      const tracksArray = Array.isArray(response) ? response : (response?.tracks || []);

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
          };
        });
        this.currentSongPath = folderPath;
        this.isLoading = false;
      });

      // Try to load saved mixer config
      await this.loadMixerConfig();
    } catch (error) {
      this.handleError('Load tracks', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }

  // Actions: Transpose
  public async transpose(semitones: number): Promise<void> {
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
        await this.loadSong(result.outputPath);
      } else {
        runInAction(() => {
          this.error = 'Transpose failed';
          this.isLoading = false;
        });
      }
    } catch (error) {
      this.handleError('Transpose', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }

  // Actions: Playback controls
  public async play(): Promise<void> {
    try {
      // Trigger playback on the service
      await this.audioService.play();

      // Wait for backend readiness signal before updating UI state
      const audioClient = await initializeAudioService().catch(() => null);
      if (audioClient) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            audioClient.off('playbackReady', onReady);
            resolve();
          }, 5000);

          const onReady = () => {
            clearTimeout(timeout);
            audioClient.off('playbackReady', onReady);
            resolve();
          };

          audioClient.on('playbackReady', onReady);
        });
      }

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

  public async transposeAudio(
    semitones: number,
    currentDirectory: string,
    allTracksData: AudioTrack[]
  ): Promise<{ success: boolean; outputDir?: string; loadedTracks?: AudioTrack[]; error?: string }> {
    if (!currentDirectory) {
      this.logError('No directory loaded to transpose');
      runInAction(() => {
        this.error = 'Please load audio files first before transposing';
      });
      return { success: false, error: 'No directory loaded' };
    }

    if (!allTracksData || allTracksData.length === 0) {
      this.logError('No tracks loaded');
      runInAction(() => {
        this.error = 'No tracks loaded to transpose';
      });
      return { success: false, error: 'No tracks loaded' };
    }

    this.log(`🎵 Starting transposition: ${semitones} semitones`);

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
      // TODO: Refactor to inject electron-adapter through services
      // Dynamic imports in ViewModels create tight coupling to platform-specific modules
      // Consider injecting these dependencies through services to improve testability
      const adapter = await import('../electron-adapter');
      const { core, fs } = adapter;

      // Call the audio transposition command
      const outputDir = await core.invoke('transpose_audio_files', {
        directory: currentDirectory,
        semitones: semitones,
      }) as string;

      this.log('✅ Transposition complete! Output directory:', outputDir);

      // Stop current audio and clear tracks
      await this.audioService.stopAllAudio();
      await this.audioService.clearTracks();

      // Load the new transposed tracks
      this.log('🔄 Loading transposed tracks from:', outputDir);

      // Read the new directory to get track paths
      const entries = await fs.readDir(outputDir);
      const audioFiles = entries
        .filter((e: { children?: unknown; name: string }) => 
          e.children === undefined &&
          (e.name.endsWith('.mp3') ||
            e.name.endsWith('.wav') ||
            e.name.endsWith('.ogg') ||
            e.name.endsWith('.m4a') ||
            e.name.endsWith('.flac'))
        )
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

      const trackPaths = audioFiles.map((f: { name: string }) => `${outputDir}/${f.name}`);

      // Add the new tracks as a song
      const results = await this.audioService.addTracks(trackPaths) as Array<{
        success: boolean;
        path?: string;
        trackId?: string;
        name?: string;
      }>;

      // Update the tracks in the UI
      const loadedTracks: AudioTrack[] = results
        .filter((result) => result.success && result.path && result.trackId)
        .map((result) => {
          // Extract filename without extension using cross-platform string operations
          const path = result.path!;
          const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
          const fileName = path.substring(lastSeparator + 1);
          const lastDot = fileName.lastIndexOf('.');
          const fallbackName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
          const trackName = this.resolveTrackName({ name: result.name, path: result.path }) || fallbackName;

          return {
            id: result.trackId!,
            path: result.path!,
            name: trackName,
            duration: 0, // Will be updated by audio service
            volume: 0.7,
            pan: 0,
            muted: false,
          };
        });

      // Emit event to update tracks in parent component
      adapter.event.emit('tracks-updated', loadedTracks);

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
      this.logError('❌ Failed to transpose audio files:', error);
      runInAction(() => {
        this.transposeProgress = {
          ...this.transposeProgress,
          message: `Error: ${error}`,
        };
        this.error = `Failed to transpose audio files: ${error}`;
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Actions: Open/Close transpose modal

  public openTransposeModal(): void {
    this.isTransposeModalOpen = true;
  }


  public closeTransposeModal(): void {
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

  public setupTransposeProgressListener(): void {
    // Import and setup listener asynchronously
    import('../electron-adapter')
      .then((adapter) => {
        const unlisten = adapter.event.listen('transpose-progress', (e: { payload: unknown }) => {
          this.log('Transpose progress:', e.payload);
          runInAction(() => {
            const payload = e.payload as {
              current_file?: string;
              total_files?: number;
              completed_files?: number;
              message?: string;
            };
            this.transposeProgress = {
              currentFile: payload.current_file || '',
              totalFiles: payload.total_files || 0,
              completedFiles: payload.completed_files || 0,
              message: payload.message || '',
            };
          });
        });
        
        // Store unlisten function for cleanup
        this.transposeUnlisten = unlisten;
        this.addSubscription(unlisten);
      })
      .catch((error: unknown) => {
        this.logError('Failed to setup transpose progress listener', error);
      });
  }

  // Cleanup transpose listener

  public cleanupTransposeListener(): void {
    if (this.transposeUnlisten) {
      this.transposeUnlisten();
      this.transposeUnlisten = null;
    }
  }

  // Interface method implementation

  public async transposeAndLoad(semitones: number): Promise<void> {
    await this.transpose(semitones);
  }

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
