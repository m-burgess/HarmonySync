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
  play(): Promise<void>;
  stop(): Promise<void>;
  onStateChange(callback: (event: unknown, state: { isPlaying: boolean }) => void): void;
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

  // Track priority for sorting
  private readonly TRACK_PRIORITY: string[] = ['click', 'guide'];

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
    this.audioService.onStateChange((event: unknown, state: { isPlaying: boolean }) => {
      runInAction(() => {
        this.isPlaying = state.isPlaying;
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
   * Sort tracks by priority
   */
  private sortTracks(a: AudioTrack, b: AudioTrack): number {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aIndex = this.TRACK_PRIORITY.indexOf(aName);
    const bIndex = this.TRACK_PRIORITY.indexOf(bName);

    // Both are priority tracks
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Only a is priority
    if (aIndex !== -1) {
      return -1;
    }

    // Only b is priority
    if (bIndex !== -1) {
      return 1;
    }

    // Neither is priority, sort alphabetically
    return aName.localeCompare(bName);
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
  public async toggleMute(trackIndex: number): Promise<boolean> {
    const track = this.tracks[trackIndex];
    if (!track) {
      this.logError('Track not found at index:', trackIndex);
      return false;
    }

    const trackId = track.id;
    const currentMuteState = this.muteStates[trackId] ?? false;
    const newMuteState = !currentMuteState;

    try {
      // Update audio service
      await this.audioService.setTrackMute(trackIndex, newMuteState);

      // Update local state
      runInAction(() => {
        this.muteStates[trackId] = newMuteState;

        // Also update track object if it has muted property
        const trackObj = this.tracks.find(t => t.id === trackId);
        if (trackObj) {
          trackObj.muted = newMuteState;
        }

        this.hasUnsavedChanges = true;
      });

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
  public async setTrackVolume(trackIndex: number, volume: number): Promise<void> {
    const track = this.tracks[trackIndex];
    if (track) {
      track.volume = volume;
      this.hasUnsavedChanges = true;
    }
  }

  public async setTrackPan(trackIndex: number, pan: number): Promise<void> {
    const track = this.tracks[trackIndex];
    if (track) {
      track.pan = pan;
      this.hasUnsavedChanges = true;
    }
  }

  public async toggleSolo(trackIndex: number): Promise<void> {
    const track = this.tracks[trackIndex];
    if (track) {
      track.solo = !track.solo;
      this.hasUnsavedChanges = true;
    }
  }

  public async setGlobalVolume(volume: number): Promise<void> {
    this.globalVolume = volume;
    this.hasUnsavedChanges = true;
  }

  public async resetTrack(trackIndex: number): Promise<void> {
    const track = this.tracks[trackIndex];
    if (track) {
      track.volume = 1.0;
      track.pan = 0;
      track.muted = false;
      track.solo = false;
      this.muteStates[track.id] = false;
      this.hasUnsavedChanges = true;
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

  /**
   * Handle errors and update error state
   */
  protected override onError(operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default MixerViewModel;
