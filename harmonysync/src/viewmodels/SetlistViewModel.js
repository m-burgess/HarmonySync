/**
 * Setlist ViewModel - Presentation logic for setlist management
 * 
 * This ViewModel manages the state and business logic for the setlist.
 * It uses MobX for reactive state management and delegates IPC calls to SetlistService.
 * 
 * Key responsibilities:
 * - Manage setlist items (songs/folders)
 * - Handle adding folders to setlist
 * - Load song metadata and tracks
 * - Handle lyrics management
 * - Track currently loaded song
 * - Handle autoplay functionality
 * - Manage preloading state
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */
import { makeAutoObservable, runInAction } from 'mobx';

class SetlistViewModel {
  // Observable state
  setlist = [];
  currentSongIndex = -1;
  currentLoadedFolder = null;
  autoplayEnabled = false;
  preloadedSongs = new Set();
  isLoading = false;
  loadingProgress = 0;
  loadingMessage = '';
  error = null;
  selectedSongForLyrics = null;
  currentBackgroundCssContent = '';
  isFirstLoad = true;
  crossfadeDuration = 3000; // 3 seconds default

  constructor(setlistService, audioService, displayService, slideService) {
    this.setlistService = setlistService;
    this.audioService = audioService;
    this.displayService = displayService;
    this.slideService = slideService;
    makeAutoObservable(this);
  }

  // Computed properties
  get currentSong() {
    return this.currentSongIndex >= 0 && this.currentSongIndex < this.setlist.length
      ? this.setlist[this.currentSongIndex]
      : null;
  }

  get hasNextSong() {
    return this.currentSongIndex >= 0 && this.currentSongIndex < this.setlist.length - 1;
  }

  get hasPreviousSong() {
    return this.currentSongIndex > 0;
  }

  get canAutoplay() {
    return this.autoplayEnabled && this.hasNextSong;
  }

  // Check if a song is preloaded
  isSongPreloaded(item) {
    return this.preloadedSongs.has(item.id || item.path);
  }

  // Actions: Add folders to setlist
  async addFolders() {
    this.isLoading = true;
    this.error = null;

    try {
      const selectedPaths = await this.setlistService.selectFolders();

      if (!selectedPaths || selectedPaths.length === 0) {
        runInAction(() => {
          this.isLoading = false;
        });
        return;
      }

      const pathsArray = Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths];
      console.log('[SetlistViewModel] Selected paths:', pathsArray);

      for (const path of pathsArray) {
        // Check if already in setlist
        if (this.setlistService.pathExistsInSetlist(this.setlist, path)) {
          const folderName = path.split('/').pop() || path.split('\\').pop();
          console.log(`📁 Folder "${folderName}" is already in the setlist, skipping...`);
          continue;
        }

        // Load metadata for the folder
        const item = await this.setlistService.loadSongMetadata(path);

        runInAction(() => {
          this.setlist.push(item);
        });
      }

      runInAction(() => {
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error adding folders:', error);
    }
  }

  // Actions: Load a setlist item (song or folder)
  async loadItem(item, index = -1) {
    // Set index if provided
    if (index >= 0) {
      runInAction(() => {
        this.currentSongIndex = index;
      });
    }

    // Check if already loaded
    if (this.currentLoadedFolder === item.path) {
      console.log('⚠️  Same folder already loaded, ignoring duplicate request:', item.path);
      runInAction(() => {
        this.loadingMessage = 'This song is already loaded';
      });
      setTimeout(() => {
        runInAction(() => {
          this.loadingMessage = '';
        });
      }, 2000);
      return { slides: [], tracks: [] };
    }

    console.log(`🎵 Loading setlist item: ${item.name}`);
    console.log(`🔍 isFirstLoad: ${this.isFirstLoad}, currentLoadedFolder: ${this.currentLoadedFolder}`);

    runInAction(() => {
      this.currentLoadedFolder = item.path;
      this.isLoading = true;
      this.loadingProgress = 0;
      this.loadingMessage = 'Loading folder contents...';
      this.error = null;
    });

    try {
      // Determine if we should use crossfade
      const shouldUseCrossfade = !this.isFirstLoad && this.currentLoadedFolder;

      if (!shouldUseCrossfade) {
        // First load or no previous tracks - clear everything
        await this.audioService.stop();
        await this.audioService.cleanup();
        console.log('🧹 Tracks cleared, proceeding with fresh load');
      }

      // Clear displays
      await this.displayService.clearAll();

      // Load slides and tracks from the item
      const result = await this.slideService.loadFromFolder(item.path);

      runInAction(() => {
        this.isLoading = false;
        this.isFirstLoad = false;
        this.loadingMessage = '';
        this.loadingProgress = 100;
      });

      return result;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
        this.loadingMessage = '';
      });
      console.error('Error loading item:', error);
      return { slides: [], tracks: [] };
    }
  }

  // Actions: Preload a song
  async preloadSong(item) {
    if (!item || item.type !== 'song') {
      console.warn('Preload called for non-song item:', item);
      return;
    }

    runInAction(() => {
      this.loadingMessage = `Preloading ${item.name}...`;
      this.loadingProgress = 0;
    });

    try {
      const tracks = item.tracks || [];
      if (tracks.length === 0) {
        console.warn('No tracks to preload for:', item);
        runInAction(() => {
          this.loadingMessage = `No tracks found for ${item.name}`;
        });
        setTimeout(() => {
          runInAction(() => {
            this.loadingMessage = '';
            this.loadingProgress = 0;
          });
        }, 1500);
        return;
      }

      // Preload each track
      let successCount = 0;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        try {
          console.log(`[preloadSong] Preloading track ${i + 1}/${tracks.length}: ${track.track_name}`);
          // In a real implementation, this would call audio service preload
          // For now, just simulate progress
          successCount++;

          runInAction(() => {
            this.loadingProgress = Math.round(((i + 1) / tracks.length) * 100);
          });
        } catch (err) {
          console.error(`[preloadSong] Error preloading track ${track.track_name}:`, err);
        }
      }

      if (successCount > 0) {
        runInAction(() => {
          this.loadingMessage = `✓ ${item.name} ready (${successCount}/${tracks.length} tracks)`;
          this.preloadedSongs.add(item.id || item.path);
        });
      } else {
        runInAction(() => {
          this.loadingMessage = `Preload failed for ${item.name}`;
        });
      }
    } catch (error) {
      console.error('Error preloading song:', error);
      runInAction(() => {
        this.loadingMessage = 'Error during preload';
      });
    }

    setTimeout(() => {
      runInAction(() => {
        this.loadingMessage = '';
        this.loadingProgress = 0;
      });
    }, 2000);
  }

  // Actions: Remove item from setlist
  removeItem(item) {
    const index = this.setlist.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.setlist.splice(index, 1);
      
      // Adjust current song index if necessary
      if (this.currentSongIndex >= index) {
        this.currentSongIndex = Math.max(-1, this.currentSongIndex - 1);
      }
    }
  }

  // Actions: Reorder setlist items
  reorderItems(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    const item = this.setlist[fromIndex];
    this.setlist.splice(fromIndex, 1);
    this.setlist.splice(toIndex, 0, item);

    // Update current song index if needed
    if (this.currentSongIndex === fromIndex) {
      this.currentSongIndex = toIndex;
    } else if (fromIndex < this.currentSongIndex && toIndex >= this.currentSongIndex) {
      this.currentSongIndex--;
    } else if (fromIndex > this.currentSongIndex && toIndex <= this.currentSongIndex) {
      this.currentSongIndex++;
    }
  }

  // Actions: Advance to next song (for autoplay)
  async advanceToNextSong() {
    if (!this.hasNextSong) {
      console.log('🎵 No next song to advance to');
      return false;
    }

    const nextIndex = this.currentSongIndex + 1;
    const nextSong = this.setlist[nextIndex];

    console.log(`🎵 Auto-advancing to next song: ${nextSong.name} (${nextIndex + 1}/${this.setlist.length})`);

    await this.loadItem(nextSong, nextIndex);
    return true;
  }

  // Actions: Handle playback completion (for autoplay)
  async handlePlaybackComplete() {
    console.log('🎵 Playback completed, checking autoplay...', {
      autoplayEnabled: this.autoplayEnabled,
      currentSongIndex: this.currentSongIndex,
      setlistLength: this.setlist.length
    });

    if (this.autoplayEnabled && this.hasNextSong) {
      setTimeout(() => {
        this.advanceToNextSong();
      }, 1000); // 1 second delay before next song
    } else if (this.autoplayEnabled && !this.hasNextSong) {
      console.log('🎵 Reached end of setlist, autoplay stopping');
      runInAction(() => {
        this.currentSongIndex = -1;
      });
    }
  }

  // Actions: Toggle autoplay
  toggleAutoplay() {
    this.autoplayEnabled = !this.autoplayEnabled;
    console.log(`🎵 Autoplay ${this.autoplayEnabled ? 'enabled' : 'disabled'}`);
  }

  // Actions: Set crossfade duration
  setCrossfadeDuration(duration) {
    this.crossfadeDuration = duration;
  }

  // Actions: Handle lyrics fetching
  async openLyricsFetcher(item) {
    this.selectedSongForLyrics = item;
  }

  async closeLyricsFetcher() {
    this.selectedSongForLyrics = null;
  }

  async handleLyricsFetched(item) {
    if (!item) {
      this.selectedSongForLyrics = null;
      return;
    }

    console.log('Lyrics fetched successfully for:', item.name);

    try {
      // Reload lyrics
      const lyrics = await this.setlistService.loadLyrics(item.path);

      // Update the item in setlist
      runInAction(() => {
        const index = this.setlist.findIndex(si => si.id === item.id);
        if (index !== -1) {
          this.setlist[index] = { ...this.setlist[index], lyrics };
        }
        this.selectedSongForLyrics = null;
      });
    } catch (error) {
      console.error('Failed to reload lyrics:', error);
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  // Actions: Edit lyrics file
  async editLyrics(item) {
    if (!item || item.type !== 'song') {
      console.warn('Edit lyrics called for non-song item:', item);
      return;
    }

    try {
      await this.setlistService.openLyricsFile(item.path);
    } catch (error) {
      console.error('Failed to open lyrics file:', error);
      runInAction(() => {
        this.error = error.message;
        // View should display this error via a modal/notification component
        // TODO: Refactor to remove direct alert() call
      });
      // Temporary alert until Views implement proper error display
      alert(`Failed to open lyrics file: ${error.message}`);
    }
  }

  // Actions: Handle service import event
  handleServiceImported(serviceStructure) {
    console.log('[SetlistViewModel] Service imported event received:', serviceStructure);

    if (serviceStructure && serviceStructure.songs && serviceStructure.songs.length > 0) {
      runInAction(() => {
        this.setlist.push(...serviceStructure.songs);
      });
      console.log(`[SetlistViewModel] Added ${serviceStructure.songs.length} songs from service to setlist`);
    }
  }

  // Actions: Clear setlist
  clearSetlist() {
    this.setlist = [];
    this.currentSongIndex = -1;
    this.currentLoadedFolder = null;
    this.preloadedSongs.clear();
  }

  // Cleanup
  dispose() {
    // Clean up any listeners or resources
    this.setlist = [];
    this.currentSongIndex = -1;
    this.currentLoadedFolder = null;
    this.preloadedSongs.clear();
  }
}

export default SetlistViewModel;
