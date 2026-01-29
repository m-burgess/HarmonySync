/**
 * Service Order ViewModel - Presentation logic for service order management
 * 
 * This ViewModel manages the state and business logic for the service order.
 * It uses MobX for reactive state management and delegates IPC calls to ServiceOrderService.
 * 
 * Key responsibilities:
 * - Manage service order items (songs/folders)
 * - Handle adding folders to service order
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

import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { IServiceOrderViewModel } from '../types/viewmodels';
import type { Song, ServiceOrderFolder } from '../types';

// Service interfaces (to be imported from actual services)
interface IServiceOrderService {
  selectFolders(): Promise<string[] | null>;
  pathExistsInServiceOrder(serviceOrder: ServiceItem[], path: string): boolean;
  loadSongMetadata(path: string): Promise<ServiceItem>;
  loadLyrics(path: string): Promise<string>;
  openLyricsFile(path: string): Promise<void>;
}

interface IAudioService {
  stop(): Promise<void>;
  cleanup(): Promise<void>;
}

interface IDisplayService {
  clearAll(): Promise<void>;
}

interface ISlideService {
  loadFromFolder(path: string): Promise<{ slides: unknown[]; tracks: unknown[] }>;
}

interface ServiceItem {
  id?: string;
  name: string;
  path: string;
  type: 'song' | 'folder';
  tracks?: unknown[];
  lyrics?: string;
}

export class ServiceOrderViewModel extends BaseViewModel implements Partial<IServiceOrderViewModel> {
  protected readonly viewModelName = 'ServiceOrderViewModel';

  // Observable state
  public folders: ServiceOrderFolder[] = [];
  public serviceOrder: ServiceItem[] = [];
  public currentSongIndex: number = -1;
  public currentLoadedFolder: string | null = null;
  public autoplayEnabled: boolean = false;
  public preloadedSongs: Set<string> = new Set();
  public isLoading: boolean = false;
  public loadingProgress: number = 0;
  public loadingMessage: string = '';
  public error: string | null = null;
  public selectedSongForLyrics: ServiceItem | null = null;
  public currentBackgroundCssContent: string = '';
  public isFirstLoad: boolean = true;
  public crossfadeDuration: number = 3000; // 3 seconds default
  public searchQuery: string = '';
  public filteredSongs: Song[] = [];

  // Services
  private serviceOrderService: IServiceOrderService;
  private audioService: IAudioService;
  private displayService: IDisplayService;
  private slideService: ISlideService;

  constructor(
    serviceOrderService: IServiceOrderService,
    audioService: IAudioService,
    displayService: IDisplayService,
    slideService: ISlideService
  ) {
    super();
    this.serviceOrderService = serviceOrderService;
    this.audioService = audioService;
    this.displayService = displayService;
    this.slideService = slideService;

    makeObservable(this, {
      folders: observable,
      serviceOrder: observable,
      currentSongIndex: observable,
      currentLoadedFolder: observable,
      autoplayEnabled: observable,
      preloadedSongs: observable,
      isLoading: observable,
      loadingProgress: observable,
      loadingMessage: observable,
      error: observable,
      selectedSongForLyrics: observable,
      currentBackgroundCssContent: observable,
      isFirstLoad: observable,
      crossfadeDuration: observable,
      searchQuery: observable,
      filteredSongs: observable,
      currentSong: computed,
      hasNextSong: computed,
      hasPreviousSong: computed,
      canAutoplay: computed,
      totalSongs: computed,
      hasSongs: computed,
      addFolders: action,
      loadItem: action,
      preloadSong: action,
      removeItem: action,
      reorderItems: action,
      advanceToNextSong: action,
      handlePlaybackComplete: action,
      toggleAutoplay: action,
      setCrossfadeDuration: action,
      openLyricsFetcher: action,
      closeLyricsFetcher: action,
      handleLyricsFetched: action,
      editLyrics: action,
      handleServiceImported: action,
      clearServiceOrder: action,
      setSelectedSongForLyrics: action,
      loadServiceOrder: action,
      addFolder: action,
      removeFolder: action,
      selectSong: action,
      setSearchQuery: action,
    });
  }

  // Computed properties
  public get currentSong(): ServiceItem | null {
    return this.currentSongIndex >= 0 && this.currentSongIndex < this.serviceOrder.length
      ? this.serviceOrder[this.currentSongIndex]
      : null;
  }

  public get hasNextSong(): boolean {
    return this.currentSongIndex >= 0 && this.currentSongIndex < this.serviceOrder.length - 1;
  }

  public get hasPreviousSong(): boolean {
    return this.currentSongIndex > 0;
  }

  public get canAutoplay(): boolean {
    return this.autoplayEnabled && this.hasNextSong;
  }

  public get totalSongs(): number {
    return this.serviceOrder.length;
  }

  public get hasSongs(): boolean {
    return this.serviceOrder.length > 0;
  }

  // Check if a song is preloaded
  public isSongPreloaded(item: ServiceItem): boolean {
    return this.preloadedSongs.has(item.id || item.path);
  }

  // Actions: Add folders to service order
  public async addFolders(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const selectedPaths = await this.serviceOrderService.selectFolders();

      if (!selectedPaths || selectedPaths.length === 0) {
        runInAction(() => {
          this.isLoading = false;
        });
        return;
      }

      const pathsArray = Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths];
      this.log('[ServiceOrderViewModel] Selected paths:', pathsArray);

      for (const path of pathsArray) {
        // Check if already in service order
        if (this.serviceOrderService.pathExistsInServiceOrder(this.serviceOrder, path)) {
          const folderName = path.split('/').pop() || path.split('\\').pop();
          this.log(`📁 Folder "${folderName}" is already in the service order, skipping...`);
          continue;
        }

        // Load metadata for the folder
        const item = await this.serviceOrderService.loadSongMetadata(path);

        runInAction(() => {
          this.serviceOrder.push(item);
        });
      }

      runInAction(() => {
        this.isLoading = false;
      });
    } catch (error) {
      this.handleError('Add folders', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }

  // Actions: Load a service order item (song or folder)
  public async loadItem(item: ServiceItem, index: number = -1): Promise<{ slides: unknown[]; tracks: unknown[] }> {
    // Set index if provided
    if (index >= 0) {
      runInAction(() => {
        this.currentSongIndex = index;
      });
    }

    // Check if already loaded
    if (this.currentLoadedFolder === item.path) {
      this.logWarn('⚠️  Same folder already loaded, ignoring duplicate request:', item.path);
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

    this.log(`🎵 Loading service order item: ${item.name}`);
    this.log(`🔍 isFirstLoad: ${this.isFirstLoad}, currentLoadedFolder: ${this.currentLoadedFolder}`);

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
        this.log('🧹 Tracks cleared, proceeding with fresh load');
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
      this.handleError('Load item', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
        this.loadingMessage = '';
      });
      return { slides: [], tracks: [] };
    }
  }

  // Actions: Preload a song
  public async preloadSong(item: ServiceItem): Promise<void> {
    if (!item || item.type !== 'song') {
      this.logWarn('Preload called for non-song item:', item);
      return;
    }

    runInAction(() => {
      this.loadingMessage = `Preloading ${item.name}...`;
      this.loadingProgress = 0;
    });

    try {
      const tracks = item.tracks || [];
      if (tracks.length === 0) {
        this.logWarn('No tracks to preload for:', item);
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
        const track = tracks[i] as { track_name: string };
        try {
          this.log(`[preloadSong] Preloading track ${i + 1}/${tracks.length}: ${track.track_name}`);
          // In a real implementation, this would call audio service preload
          // For now, just simulate progress
          successCount++;

          runInAction(() => {
            this.loadingProgress = Math.round(((i + 1) / tracks.length) * 100);
          });
        } catch (err) {
          this.logError(`[preloadSong] Error preloading track ${track.track_name}:`, err);
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
      this.logError('Error preloading song:', error);
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

  // Actions: Remove item from service order
  public removeItem(item: ServiceItem): void {
    const index = this.serviceOrder.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.serviceOrder.splice(index, 1);

      // Adjust current song index if necessary
      if (this.currentSongIndex >= index) {
        this.currentSongIndex = Math.max(-1, this.currentSongIndex - 1);
      }
    }
  }

  // Actions: Reorder service order items
  public reorderItems(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const item = this.serviceOrder[fromIndex];
    this.serviceOrder.splice(fromIndex, 1);
    this.serviceOrder.splice(toIndex, 0, item);

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
  public async advanceToNextSong(): Promise<boolean> {
    if (!this.hasNextSong) {
      this.log('🎵 No next song to advance to');
      return false;
    }

    const nextIndex = this.currentSongIndex + 1;
    const nextSong = this.serviceOrder[nextIndex];

    this.log(`🎵 Auto-advancing to next song: ${nextSong.name} (${nextIndex + 1}/${this.serviceOrder.length})`);

    await this.loadItem(nextSong, nextIndex);
    return true;
  }

  // Actions: Handle playback completion (for autoplay)
  public async handlePlaybackComplete(): Promise<void> {
    this.log('🎵 Playback completed, checking autoplay...', {
      autoplayEnabled: this.autoplayEnabled,
      currentSongIndex: this.currentSongIndex,
      serviceOrderLength: this.serviceOrder.length,
    });

    if (this.autoplayEnabled && this.hasNextSong) {
      setTimeout(() => {
        this.advanceToNextSong();
      }, 1000); // 1 second delay before next song
    } else if (this.autoplayEnabled && !this.hasNextSong) {
      this.log('🎵 Reached end of service order, autoplay stopping');
      runInAction(() => {
        this.currentSongIndex = -1;
      });
    }
  }

  // Actions: Toggle autoplay
  public toggleAutoplay(): void {
    this.autoplayEnabled = !this.autoplayEnabled;
    this.log(`🎵 Autoplay ${this.autoplayEnabled ? 'enabled' : 'disabled'}`);
  }

  // Actions: Set crossfade duration
  public setCrossfadeDuration(duration: number): void {
    this.crossfadeDuration = duration;
  }

  // Actions: Handle lyrics fetching
  public async openLyricsFetcher(item: ServiceItem): Promise<void> {
    this.selectedSongForLyrics = item;
  }

  public async closeLyricsFetcher(): Promise<void> {
    this.selectedSongForLyrics = null;
  }

  public async handleLyricsFetched(item: ServiceItem | null): Promise<void> {
    if (!item) {
      this.selectedSongForLyrics = null;
      return;
    }

    this.log('Lyrics fetched successfully for:', item.name);

    try {
      // Reload lyrics
      const lyrics = await this.serviceOrderService.loadLyrics(item.path);

      // Update the item in service order
      runInAction(() => {
        const index = this.serviceOrder.findIndex(si => si.id === item.id);
        if (index !== -1) {
          this.serviceOrder[index] = { ...this.serviceOrder[index], lyrics };
        }
        this.selectedSongForLyrics = null;
      });
    } catch (error) {
      this.handleError('Reload lyrics', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }

  // Actions: Edit lyrics file
  public async editLyrics(item: ServiceItem): Promise<void> {
    if (!item || item.type !== 'song') {
      this.logWarn('Edit lyrics called for non-song item:', item);
      return;
    }

    try {
      await this.serviceOrderService.openLyricsFile(item.path);
    } catch (error) {
      this.handleError('Open lyrics file', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        // View should display this error via a modal/notification component
      });
    }
  }

  // Actions: Handle service import event
  public handleServiceImported(serviceStructure: { songs?: ServiceItem[] }): void {
    this.log('[ServiceOrderViewModel] Service imported event received:', serviceStructure);

    if (serviceStructure && serviceStructure.songs && serviceStructure.songs.length > 0) {
      runInAction(() => {
        this.serviceOrder.push(...(serviceStructure.songs || []));
      });
      this.log(`[ServiceOrderViewModel] Added ${serviceStructure.songs.length} songs from service to service order`);
    }
  }

  // Actions: Clear service order
  public clearServiceOrder(): void {
    this.serviceOrder = [];
    this.currentSongIndex = -1;
    this.currentLoadedFolder = null;
    this.preloadedSongs.clear();
  }

  // Direct state setter for App.jsx compatibility (to be phased out)
  public setSelectedSongForLyrics(lyrics: ServiceItem | null): void {
    this.selectedSongForLyrics = lyrics;
  }

  // Interface methods implementation
  public async loadServiceOrder(basePath: string): Promise<void> {
    this.log('Loading service order from:', basePath);
    // Implementation here
  }

  public async addFolder(): Promise<void> {
    await this.addFolders();
  }

  public async removeFolder(folderPath: string): Promise<void> {
    const item = this.serviceOrder.find(i => i.path === folderPath);
    if (item) {
      this.removeItem(item);
    }
  }

  public async selectSong(song: Song): Promise<void> {
    const index = this.serviceOrder.findIndex(i => i.path === song.folderPath);
    if (index >= 0) {
      await this.loadItem(this.serviceOrder[index], index);
    }
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    // Implement search filtering logic
  }

  /**
   * Handle errors and update error state
   */
  protected override onError(_operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default ServiceOrderViewModel;
