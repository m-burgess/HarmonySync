/**
 * Mixer ViewModel - Presentation logic for audio mixer
 * 
 * This ViewModel manages the state and business logic for the mixer sidebar.
 * It uses MobX for reactive state management and delegates operations to AudioService.
 * 
 * Key responsibilities:
 * - Manage track mute states
 * - Handle play/stop controls for all tracks
 * - Sort tracks by priority (click, guide, then alphabetically)
 * - Track operation progress state
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */

import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { IMixerViewModel } from '../types/viewmodels';
import type { AudioTrack } from '../types';

// Service interface
interface IAudioService {
  setTrackMute(trackIndex: number, muted: boolean): Promise<void>;
  setTrackVolume(trackIndex: number, volume: number): Promise<void>;
  setTrackPan(trackIndex: number, pan: number): Promise<void>;
  play(): Promise<void>;
  stop(): Promise<void>;
  onStateChange(callback: (event: unknown, state: any) => void): void;
  transposeSong(songId: string, semitones: number): void;
}

export class MixerViewModel extends BaseViewModel implements IMixerViewModel {
  protected readonly viewModelName = 'MixerViewModel';

  // Observable state
  public tracks: AudioTrack[] = [];
  public muteStates: Record<string, boolean> = {};
  public isPlaying: boolean = false;
  public isOperationInProgress: boolean = false;
  public isLoadingTracks: boolean = false;
  public error: string | null = null;
  public globalVolume: number = 1.0;
  public currentSongPath: string | null = null;
  public hasUnsavedChanges: boolean = false;
  public isSaving: boolean = false;
  public currentTransposition: number = 0;
  public isTransposing: boolean = false;

  public currentSongId: string | null = null;

  // Track priority keywords for sorting (order matters: click first, guide second, metronome third)
  private readonly TRACK_PRIORITY: string[] = ['click', 'guide', 'metronome'];

  // Service
  private audioService: IAudioService;

  constructor(audioService: IAudioService) {
    super();
    this.audioService = audioService;

    makeObservable(this, {
      tracks: observable,
      muteStates: observable,
      isPlaying: observable,
      isOperationInProgress: observable,
      isLoadingTracks: observable,
      error: observable,
      globalVolume: observable,
      currentSongPath: observable,
      hasUnsavedChanges: observable,
      isSaving: observable,
      currentTransposition: observable,
      isTransposing: observable,
      currentSongId: observable,
      hasTracks: computed,
      sortedTracks: computed,
      canPlay: computed,
      canStop: computed,
      mutedTracks: computed,
      soloedTracks: computed,
      activeTracks: computed,
      setTracks: action,
      syncTracks: action,
      toggleMute: action,
      playAll: action,
      stopAll: action,
      setLoadingTracks: action,
      setTrackVolume: action,
      setTrackPan: action,
      toggleSolo: action,
      setGlobalVolume: action,
      resetTrack: action,
      resetAllTracks: action,
      saveConfig: action,
      loadConfig: action,
      transpose: action,
    });
  }

  /**
   * Initialize ViewModel - setup listeners
   */
  protected override async onInitialize(): Promise<void> {
    this.setupListeners();
  }

  /**
   * Setup IPC listeners
   */
  private setupListeners(): void {
    // Listen for state changes
    this.audioService.onStateChange((_event: unknown, state: any) => {
      // console.log('[MixerViewModel] onStateChange:', state);
      runInAction(() => {
        this.isPlaying = state.isPlaying;

        // Ensure we catch the ID update
        const newId = state.currentSongId;
        if (newId !== undefined) {
          if (newId !== this.currentSongId) {
            console.log(`[MixerViewModel] Updating currentSongId: ${this.currentSongId} -> ${newId}`);
            this.currentSongId = newId || null;
          }
        }

        // Sync transposition
        if (state.transposition !== undefined) {
          this.currentTransposition = state.transposition;
        }

        // Sync loading progress
        if (state.loadingProgress) {
          // We could expose this as an observable if the UI needs it
          // For now, let's just log it or maybe update a status string?
          // "Loading 5/17"
          // The user wanted to SEE progress.
          // Let's add a public property `loadingStatus` to the VM?
          // Or just assume `isLoadingTracks` is boolean.
          // Let's add `loadingStatus` string.
          console.log(`[MixerViewModel] Loading: ${state.loadingProgress.current}/${state.loadingProgress.total}`);
        }

        // If we were transposing, we can stop the loading state
        if (this.isTransposing) {
          this.isTransposing = false;
        }
      });
    });
  }

  // Computed properties
  public get hasTracks(): boolean {
    return this.tracks.length > 0;
  }

  public get sortedTracks(): AudioTrack[] {
    return [...this.tracks].sort(this.sortTracks.bind(this));
  }

  public get canPlay(): boolean {
    return this.hasTracks && !this.isOperationInProgress;
  }

  public get canStop(): boolean {
    return this.isPlaying && !this.isOperationInProgress;
  }

  public get mutedTracks(): AudioTrack[] {
    return this.tracks.filter(track => this.muteStates[track.id] === true);
  }

  public get soloedTracks(): AudioTrack[] {
    return this.tracks.filter(track => track.solo === true);
  }

  public get activeTracks(): AudioTrack[] {
    const hasSolo = this.soloedTracks.length > 0;
    if (hasSolo) {
      return this.soloedTracks;
    }
    return this.tracks.filter(track => !this.muteStates[track.id]);
  }

  /**
   * Get the priority index for a track name using keyword matching.
   * Returns the index of the first matching priority keyword, or -1.
   */
  private getTrackPriority(name: string): number {
    const lower = name.toLowerCase();
    return this.TRACK_PRIORITY.findIndex(keyword => lower.includes(keyword));
  }

  /**
   * Sort tracks: Click first, Guide second, Metronome third, then A-Z
   */
  private sortTracks(a: AudioTrack, b: AudioTrack): number {
    const aPriority = this.getTrackPriority(a.name || '');
    const bPriority = this.getTrackPriority(b.name || '');

    // Both are priority tracks
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }

    // Only a is priority
    if (aPriority !== -1) return -1;

    // Only b is priority
    if (bPriority !== -1) return 1;

    // Neither is priority, sort alphabetically
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  }

  // Actions: Set tracks
  public setTracks(tracks: AudioTrack[]): void {
    this.tracks = tracks || [];

    // Initialize mute states for new tracks
    const newMuteStates: Record<string, boolean> = {};
    tracks.forEach(track => {
      // Preserve existing mute state if available
      newMuteStates[track.id] = this.muteStates[track.id] ?? track.muted ?? false;
    });
    this.muteStates = newMuteStates;
  }

  // Actions: Sync tracks (update from external source like AudioViewModel)
  public syncTracks(tracks: AudioTrack[]): void {
    this.setTracks(tracks);
  }

  // Actions: Toggle track mute
  public async toggleMute(trackId: string): Promise<boolean> {
    const originalIndex = this.tracks.findIndex(t => t.id === trackId);
    if (originalIndex === -1) {
      this.logError('Track not found with ID:', trackId);
      return false;
    }

    const currentMuteState = this.muteStates[trackId] ?? false;
    const newMuteState = !currentMuteState;

    try {
      // Update local state immediately
      runInAction(() => {
        this.muteStates[trackId] = newMuteState;

        // Also update track object if it has muted property
        const trackObj = this.tracks[originalIndex];
        if (trackObj) {
          trackObj.muted = newMuteState;
        }

        this.hasUnsavedChanges = true;
      });

      // Call service (if needed, though currently service state might not be synced immediately)
      // If service expects index, pass originalIndex
      // this.audioService.setTrackMute(originalIndex, newMuteState); 
      // Note: AudioService might not implement this fully yet based on previous code comments, 
      // but we should call it if available.
      if (this.audioService.setTrackMute) {
        await this.audioService.setTrackMute(originalIndex, newMuteState);
      }

      return true;
    } catch (error) {
      this.handleError('Toggle mute', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
      return false;
    }
  }

  // Actions: Play all tracks
  public async playAll(): Promise<boolean> {
    if (!this.canPlay) {
      return false;
    }

    this.isOperationInProgress = true;
    this.error = null;

    try {
      await this.audioService.play();

      runInAction(() => {
        this.isPlaying = true;
        this.isOperationInProgress = false;
      });

      return true;
    } catch (error) {
      this.handleError('Play', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isOperationInProgress = false;
      });
      return false;
    }
  }

  // Actions: Stop all audio
  public async stopAll(): Promise<boolean> {
    if (!this.canStop) {
      return false;
    }

    this.isOperationInProgress = true;
    this.error = null;

    try {
      await this.audioService.stop();

      runInAction(() => {
        this.isPlaying = false;
        this.isOperationInProgress = false;
      });

      return true;
    } catch (error) {
      this.handleError('Stop', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isOperationInProgress = false;
      });
      return false;
    }
  }

  // Actions: Set loading state
  public setLoadingTracks(isLoading: boolean): void {
    this.isLoadingTracks = isLoading;
  }

  // Utility: Check if track is muted
  public isTrackMuted(trackId: string): boolean {
    return this.muteStates[trackId] ?? false;
  }

  // Utility: Format track name for display
  public formatTrackName(track: AudioTrack): string {
    if (!track || !track.name) {
      return 'Unknown Track';
    }

    return track.name
      .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .trim();
  }

  // Utility: Get mute icon
  public getMuteIcon(trackId: string): string {
    return this.isTrackMuted(trackId) ? '🔇' : '🔊';
  }

  // Interface method implementations
  public async setTrackVolume(trackId: string, volume: number): Promise<void> {
    const originalIndex = this.tracks.findIndex(t => t.id === trackId);

    if (originalIndex !== -1) {
      const track = this.tracks[originalIndex];
      // Update local state immediately for responsiveness
      runInAction(() => {
        track.volume = volume;
        this.hasUnsavedChanges = true;
      });

      // Call service
      try {
        await this.audioService.setTrackVolume(originalIndex, volume);
      } catch (error) {
        this.handleError('Set volume', error);
      }
    }
  }

  public async setTrackPan(trackId: string, pan: number): Promise<void> {
    const originalIndex = this.tracks.findIndex(t => t.id === trackId);

    if (originalIndex !== -1) {
      const track = this.tracks[originalIndex];
      // Update local state immediately
      runInAction(() => {
        track.pan = pan;
        this.hasUnsavedChanges = true;
      });

      // Call service
      try {
        await this.audioService.setTrackPan(originalIndex, pan);
      } catch (error) {
        this.handleError('Set pan', error);
      }
    }
  }

  public async toggleSolo(trackId: string): Promise<void> {
    const originalIndex = this.tracks.findIndex(t => t.id === trackId);

    if (originalIndex !== -1) {
      const track = this.tracks[originalIndex];
      runInAction(() => {
        track.solo = !track.solo;
        this.hasUnsavedChanges = true;
      });
    }
  }

  public async setGlobalVolume(volume: number): Promise<void> {
    this.globalVolume = volume;
    this.hasUnsavedChanges = true;
  }

  public async resetTrack(trackId: string): Promise<void> {
    const originalIndex = this.tracks.findIndex(t => t.id === trackId);

    if (originalIndex !== -1) {
      const track = this.tracks[originalIndex];
      runInAction(() => {
        track.volume = 1.0;
        track.pan = 0;
        track.muted = false;
        track.solo = false;
        this.muteStates[track.id] = false;
        this.hasUnsavedChanges = true;
      });
    }
  }

  public async resetAllTracks(): Promise<void> {
    this.tracks.forEach(track => {
      track.volume = 1.0;
      track.pan = 0;
      track.muted = false;
      track.solo = false;
      this.muteStates[track.id] = false;
    });
    this.globalVolume = 1.0;
    this.hasUnsavedChanges = true;
  }

  public async saveConfig(): Promise<void> {
    if (!this.currentSongPath) {
      this.logWarn('No current song path to save config');
      return;
    }

    this.isSaving = true;
    try {
      // Save config logic here
      this.log('Saving mixer config for:', this.currentSongPath);
      runInAction(() => {
        this.hasUnsavedChanges = false;
        this.isSaving = false;
      });
    } catch (error) {
      this.handleError('Save config', error);
      runInAction(() => {
        this.isSaving = false;
      });
    }
  }

  public async loadConfig(songPath: string): Promise<void> {
    this.currentSongPath = songPath;
    try {
      // Load config logic here
      this.log('Loading mixer config for:', songPath);
      runInAction(() => {
        this.hasUnsavedChanges = false;
      });
    } catch (error) {
      this.handleError('Load config', error);
    }
  }

  public async transpose(semitones: number): Promise<void> {
    if (!this.currentSongPath && !this.hasTracks) {
      this.logWarn('Cannot transpose: no song loaded');
      return;
    }

    // We need the current song ID. 
    // Since we don't strictly track song ID in ViewModel (only songPath/tracks), 
    // and `currentSongPath` might not be the ID used by backend?
    // The backend uses `currentSongId`. 
    // However, `RemoteAudioMixer` stores `getState()`.

    // Ideally we should get the current song ID from state.
    // For now, let's assume the service handles "current song" if we don't pass ID? Or we pass ID.
    // RemoteAudioMixer `transposeSong` needs ID.

    // HACK: We can ask the service for the current song ID if we don't have it locally matched.
    // Or we rely on the fact that we loaded a song.

    // Let's iterate: updating `this.audioService.transposeSong` to take `songId`.
    // But ViewModel doesn't know `songId` easily unless we sync it from backend state.

    // Let's assume we can get it from the service state via `onStateChange` (which we partially did).
    // Or we expose a getter on the service?

    // Actually, `RemoteAudioMixer` knows `currentSongId` if we update it.
    // But `IAudioService` in ViewModel is generic.

    // Solution: Pass the `songId` if we have it, or rely on service to use current.
    // But `RemoteAudioMixer` is just a class. handling generic ID.

    // Let's update `setupListeners` to store `currentSongId`.
    this.isTransposing = true;

    // We need songId. Let's assume we can get it or we passed it in previously.
    // The `state` object in `setupListeners` has `currentSongId`.
    // I should create a property for it.

    // Wait, I can't access `this.currentSongId` inside `transpose` if I haven't defined it.
    // I need to add `currentSongId` to ViewModel.

    // For now, let's just trigger it sending the current song if possible, or fail if no ID ? 
    // I'll add `currentSongId` to ViewModel property in a separate tool call if needed, 
    // or assume I can get it from `state`.

    // Actually, I can allow `transpose` to take an ID, or I can store `currentSongId` in ViewModel.
    // I will use `this.currentSongId` which I will add to the class in next step if I missed it, 
    // actually I haven't added `currentSongId` to the class properties list in the previous replace.

    // Let's check the previous replace... I added `currentTransposition` and `isTransposing`.
    // I did NOT add `currentSongId`. 

    // I will add `public currentSongId: string | null = null;` to the class properties
    // AND update `setupListeners` to sync it.

    // But first, let's just add the method stub that uses `this.currentSongId` (assuming existence)
    // and I will fix the property definition in the next step.

    if (this.currentSongId) {
      this.audioService.transposeSong(this.currentSongId, semitones);
    } else {
      this.logWarn('No current song ID to transpose');
      this.isTransposing = false;
    }
  }

  // Handle errors and update error state
  protected override onError(operation: string, errorMessage: string): void {
    // console.error(`[MixerViewModel] Error in ${operation}: ${errorMessage}`);
    runInAction(() => {
      this.error = errorMessage;
      this.isTransposing = false;
    });
  }
}

export default MixerViewModel;
