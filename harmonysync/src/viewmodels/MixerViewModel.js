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
import { makeAutoObservable, runInAction } from 'mobx';

class MixerViewModel {
  // Observable state
  tracks = [];
  muteStates = {};
  isPlaying = false;
  isOperationInProgress = false;
  isLoadingTracks = false;
  error = null;

  // Track priority for sorting
  TRACK_PRIORITY = ['click', 'guide'];

  constructor(audioService) {
    this.audioService = audioService;
    makeAutoObservable(this);
    this._setupListeners();
  }

  // Private: Setup IPC listeners
  _setupListeners() {
    // Listen for state changes
    this.audioService.onStateChange((event, state) => {
      runInAction(() => {
        this.isPlaying = state.isPlaying;
      });
    });
  }

  // Computed properties
  get hasTracks() {
    return this.tracks.length > 0;
  }

  get sortedTracks() {
    return [...this.tracks].sort(this._sortTracks.bind(this));
  }

  get canPlay() {
    return this.hasTracks && !this.isOperationInProgress;
  }

  get canStop() {
    return this.isPlaying && !this.isOperationInProgress;
  }

  // Private: Sort tracks by priority
  _sortTracks(a, b) {
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
  setTracks(tracks) {
    this.tracks = tracks || [];
    
    // Initialize mute states for new tracks
    const newMuteStates = {};
    tracks.forEach(track => {
      // Preserve existing mute state if available
      newMuteStates[track.id] = this.muteStates[track.id] ?? track.isMuted ?? false;
    });
    this.muteStates = newMuteStates;
  }

  // Actions: Sync tracks (update from external source like AudioViewModel)
  syncTracks(tracks) {
    this.setTracks(tracks);
  }

  // Actions: Toggle track mute
  async toggleMute(track) {
    const trackId = track.id;
    const currentMuteState = this.muteStates[trackId] ?? false;
    const newMuteState = !currentMuteState;

    try {
      // Find track index for audio service
      const trackIndex = this.tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) {
        throw new Error('Track not found');
      }

      // Update audio service
      await this.audioService.setTrackMute(trackIndex, newMuteState);
      
      // Update local state
      runInAction(() => {
        this.muteStates[trackId] = newMuteState;
        
        // Also update track object if it has isMuted property
        const trackObj = this.tracks.find(t => t.id === trackId);
        if (trackObj) {
          trackObj.isMuted = newMuteState;
        }
      });
      
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Failed to toggle mute:', error);
      return false;
    }
  }

  // Actions: Play all tracks
  async playAll() {
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
      runInAction(() => {
        this.error = error.message;
        this.isOperationInProgress = false;
      });
      console.error('Play failed:', error);
      return false;
    }
  }

  // Actions: Stop all audio
  async stopAll() {
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
      runInAction(() => {
        this.error = error.message;
        this.isOperationInProgress = false;
      });
      console.error('Stop failed:', error);
      return false;
    }
  }

  // Actions: Set loading state
  setLoadingTracks(isLoading) {
    this.isLoadingTracks = isLoading;
  }

  // Utility: Check if track is muted
  isTrackMuted(trackId) {
    return this.muteStates[trackId] ?? false;
  }

  // Utility: Format track name for display
  formatTrackName(track) {
    if (!track || !track.name) {
      return 'Unknown Track';
    }
    
    return track.name
      .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .trim();
  }

  // Utility: Get mute icon
  getMuteIcon(trackId) {
    return this.isTrackMuted(trackId) ? '🔇' : '🔊';
  }

  // Cleanup
  dispose() {
    this.tracks = [];
    this.muteStates = {};
    this.isPlaying = false;
    this.isOperationInProgress = false;
  }
}

export default MixerViewModel;
