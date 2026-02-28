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
  loadLyrics(path: string): Promise<string | null>;
  openLyricsFile(path: string): Promise<void>;
}

interface IAudioService {
  stop(): Promise<void>;
  cleanup(): Promise<void>;
  loadTracks(folderPath: string): Promise<{ tracks?: AudioTrackInfo[] }>;
  preloadAllTracks(): Promise<void>;
  // Multi-song preloading
  preloadSong(songId: string, folderPath: string, trackFiles: string[]): Promise<void>;
  switchSong(songId: string): void;
  isSongPreloaded(songId: string): boolean;
  clearSong(songId: string): void;
}

interface IDisplayService {
  clearAll(): Promise<void>;
  displayVideoSlide(path: string, duration?: number): Promise<void>;
}

interface ISlideService {
  loadFromFolder(path: string): Promise<{ slides: unknown[]; tracks: unknown[] }>;
}

interface AudioTrackInfo {
  track_name: string;
  file_path: string;
}

interface ServiceItem {
  id?: string;
  name: string;
  path: string;
  type: 'song' | 'folder';
  tracks?: AudioTrackInfo[];
  lyrics?: string;
  hasAudio?: boolean;
  audioFileCount?: number;
  files?: string[];
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
  public preloadingSongs: Set<string> = new Set();
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
      preloadingSongs: observable,
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

  // Check if a song is currently being preloaded
  public isSongPreloading(item: ServiceItem): boolean {
    return this.preloadingSongs.has(item.id || item.path);
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

        // Auto-preload if it's a song folder with audio files
        if (item.type === 'song' && item.hasAudio) {
          this.log(`[addFolders] Auto-preloading detected song folder: ${item.name}`);

          // Trigger preload asynchronously (don't wait for completion)
          this.preloadSong(item).catch(error => {
            this.logError(`[addFolders] Auto-preload failed for ${item.name}:`, error);
          });
        }
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
      const songId = item.id || item.path;

      // If this song is already preloaded in the Go engine, instant-switch!
      if (item.type === 'song' && this.audioService.isSongPreloaded(songId)) {
        this.log(`⚡ Song "${item.name}" is preloaded — instant switch`);
        this.audioService.switchSong(songId);

        // Clear displays and load slides
        await this.displayService.clearAll();
        const result = await this.slideService.loadFromFolder(item.path);
        const allSlides = (result.slides || []) as Array<{ type?: string; path?: string; duration?: number }>;
        const videoSlides = allSlides.filter(slide => slide?.type === 'video');

        this.log(`[loadItem-Preloaded] Loaded ${allSlides.length} slides total. Video slides found: ${videoSlides.length}`);

        if (videoSlides.length > 0 && videoSlides[0]?.path) {
          this.log(`[loadItem-Preloaded] Attempting to auto-play background video: ${videoSlides[0].path}`);
          await this.displayService.displayVideoSlide(videoSlides[0].path, videoSlides[0].duration);
        } else {
          this.log('[loadItem-Preloaded] No video slides found.');
        }

        runInAction(() => {
          this.isLoading = false;
          this.isFirstLoad = false;
          this.loadingMessage = '';
          this.loadingProgress = 100;
        });

        // Load lyrics
        const lyrics = await this.serviceOrderService.loadLyrics(item.path);
        runInAction(() => { item.lyrics = lyrics || undefined; });

        return { slides: item.type === 'song' ? [] : allSlides, tracks: result.tracks || [] };
      }

      // Not preloaded — full load path (legacy fallback)
      this.log(`⏳ Song "${item.name}" not preloaded — full load`);
      await this.audioService.stop();
      await this.audioService.cleanup();
      this.log('🧹 Tracks cleared, proceeding with fresh load');

      // Clear displays
      await this.displayService.clearAll();

      // Load slides and tracks from the item
      this.log(`📂 Calling slideService.loadFromFolder with path: ${item.path}`);
      const result = await this.slideService.loadFromFolder(item.path);
      this.log(`📂 slideService.loadFromFolder returned:`, result);

      const allSlides = (result.slides || []) as Array<{ type?: string; path?: string; duration?: number }>;
      const videoSlides = allSlides.filter(slide => slide?.type === 'video');

      this.log(`[loadItem] Loaded ${allSlides.length} slides total. Video slides found: ${videoSlides.length}`);
      if (videoSlides.length > 0) {
        this.log(`[loadItem] First video slide: ${JSON.stringify(videoSlides[0])}`);
      }

      if (item.type === 'song' && videoSlides.length > 0) {
        const firstVideo = videoSlides[0];
        if (firstVideo?.path) {
          this.log(`[loadItem] Attempting to auto-play background video: ${firstVideo.path}`);
          await this.displayService.displayVideoSlide(firstVideo.path, firstVideo.duration);
        } else {
          this.logWarn('[loadItem] Video slide found but path is missing');
        }
      } else if (item.type === 'song') {
        this.log('[loadItem] No video slides found for this song.');
      }

      runInAction(() => {
        this.isLoading = false;
        this.isFirstLoad = false;
        this.loadingMessage = '';
        this.loadingProgress = 100;
      });

      // Load lyrics.txt when a song is selected
      if (item.type === 'song') {
        const lyrics = await this.serviceOrderService.loadLyrics(item.path);
        runInAction(() => {
          item.lyrics = lyrics || undefined;
        });
        this.log('📜 Loaded lyrics for song:', item.name);
      } else {
        // Clear lyrics for non-song items
        runInAction(() => {
          this.selectedSongForLyrics = null;
        });
      }

      return {
        slides: item.type === 'song' ? [] : allSlides,
        tracks: result.tracks || []
      };
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

  // Actions: Preload a song into the Go engine (background, non-blocking)
  public async preloadSong(item: ServiceItem): Promise<void> {
    if (!item || item.type !== 'song') {
      this.logWarn('Preload called for non-song item:', item);
      return;
    }

    const songId = item.id || item.path;

    // Already preloaded?
    if (this.preloadedSongs.has(songId)) {
      this.log(`⚡ ${item.name} already preloaded — skipping`);
      return;
    }

    runInAction(() => {
      this.preloadingSongs.add(songId);
      this.loadingMessage = `Preloading ${item.name}...`;
      this.loadingProgress = 0;
    });

    try {
      // Collect audio file paths from the item
      const trackFiles = (item.tracks || []).map(t => t.file_path);
      if (trackFiles.length === 0 && item.files) {
        // Fallback: use the files array if tracks haven't been populated
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
        trackFiles.push(...item.files.filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext))));
      }

      if (trackFiles.length === 0) {
        this.logWarn('No audio files to preload for:', item.name);
        runInAction(() => {
          this.loadingMessage = `No audio files found for ${item.name}`;
        });
        setTimeout(() => runInAction(() => { this.loadingMessage = ''; this.loadingProgress = 0; }), 1500);
        return;
      }

      this.log(`🔄 Preloading ${trackFiles.length} tracks for "${item.name}" → Go engine`);

      // Send to backend for Go engine preloading
      await this.audioService.preloadSong(songId, item.path, trackFiles);

      runInAction(() => {
        this.loadingProgress = 100;
        this.loadingMessage = `✓ ${item.name} ready (${trackFiles.length} tracks preloaded)`;
        this.preloadedSongs.add(songId);
        this.preloadingSongs.delete(songId);
      });

      this.log(`✅ Preloaded ${item.name} (${trackFiles.length} tracks buffered in Go engine)`);
    } catch (error) {
      this.logError(`Preload failed for ${item.name}:`, error);
      runInAction(() => {
        this.loadingMessage = `Preload failed for ${item.name}`;
        this.preloadingSongs.delete(songId);
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
          this.serviceOrder[index] = { ...this.serviceOrder[index], lyrics: lyrics ?? undefined };
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

      // Auto-preload all imported songs
      serviceStructure.songs.forEach(song => {
        if (song.type === 'song' && !this.isSongPreloaded(song)) {
          this.preloadSong(song).catch(e => this.logWarn(`Failed to auto-preload ${song.name}`, e));
        }
      });
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
  public setSelectedSongForLyrics(item: ServiceItem | null): void {
    this.selectedSongForLyrics = item;
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
