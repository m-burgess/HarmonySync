/**
 * ViewModel interface definitions
 * These interfaces define the contracts for all ViewModel classes
 */

import type {
  AudioTrack,
  Display,
  DisplayWindow,
  MemoryUsage,
  Slide,
  ServiceOrderFolder,

  Timer,
} from './models';

/**
 * Base ViewModel interface - all ViewModels implement this
 */
export interface IViewModel {
  /**
   * Initialize the ViewModel
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources and unsubscribe from events
   */
  dispose?(): void;
}

/**
 * Audio ViewModel interface
 */
export interface IAudioViewModel extends IViewModel {
  // Observable state
  tracks: AudioTrack[];
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  memoryUsage: MemoryUsage | null;
  currentSongPath: string | null;
  audioServiceStatus: 'connecting' | 'connected' | 'error';
  serviceError: string | null;
  isStartingService: boolean;

  isOperationInProgress: boolean;
  globalVolume: number;

  // Actions
  loadSong(folderPath: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(position: number): Promise<void>;
  setTrackVolume(trackIndex: number, volume: number): Promise<void>;
  setTrackPan(trackIndex: number, pan: number): Promise<void>;
  muteTrack(trackIndex: number): Promise<void>;
  unmuteTrack(trackIndex: number): Promise<void>;
  toggleTrackMute(trackIndex: number): Promise<void>;
  setGlobalVolume(volume: number): Promise<void>;

  saveMixerConfig(): Promise<void>;
  loadMixerConfig(): Promise<void>;
  startAudioService(): Promise<void>;

  // Computed
  hasTracksLoaded: boolean;
  formattedPosition: string;
  formattedDuration: string;
  progressPercentage: number;
}

/**
 * Service Order ViewModel interface
 */
export interface IServiceOrderViewModel extends IViewModel {
  // Observable state
  folders: ServiceOrderFolder[];
  currentSong: any; // ServiceItem internal type
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredSongs: any[];

  // Actions
  loadServiceOrder(basePath: string): Promise<void>;
  addFolder(): Promise<void>;
  removeFolder(folderPath: string): Promise<void>;
  selectSong(song: any): Promise<void>;
  setSearchQuery(query: string): void;

  // Computed
  totalSongs: number;
  hasSongs: boolean;
}

/**
 * Slide ViewModel interface
 */
export interface ISlideViewModel extends IViewModel {
  // Observable state
  slides: Slide[];
  currentSlideIndex: number;
  isLoading: boolean;
  error: string | null;
  displayId: string | null;

  // Actions
  loadSlides(folderPath: string): Promise<void>;
  nextSlide(): Promise<void>;
  previousSlide(): Promise<void>;
  goToSlide(index: number): Promise<void>;
  displaySlide(slideId: string): Promise<void>;
  clearDisplay(): Promise<void>;
  importSlide(content: string): Promise<void>;
  deleteSlide(slide: Slide): void;
  reorderSlides(slideIds: string[]): Promise<void>;

  // Computed
  currentSlide: Slide | null;
  hasNextSlide: boolean;
  hasPreviousSlide: boolean;
  slideCount: number;
}

/**
 * Display ViewModel interface
 */
export interface IDisplayViewModel extends IViewModel {
  // Observable state
  displays: Display[];
  windows: Map<string, DisplayWindow>;
  selectedDisplayId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDisplays(): Promise<void>;
  openAudienceWindow(displayId: string): Promise<void>;
  openConfidenceWindow(displayId: string): Promise<void>;
  openLowerThirdsWindow(displayId: string): Promise<void>;
  openPreserviceWindow(displayId: string): Promise<void>;
  closeWindow(type: DisplayWindow['type']): Promise<void>;
  setWindowBounds(type: DisplayWindow['type'], bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  selectDisplay(displayId: string): void;

  // Computed
  primaryDisplay: Display | null;
  secondaryDisplays: Display[];
  openWindows: DisplayWindow[];
}

/**
 * Mixer ViewModel interface
 */
export interface IMixerViewModel extends IViewModel {
  // Observable state
  tracks: AudioTrack[];
  globalVolume: number;
  currentSongPath: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  // Actions
  setTrackVolume(trackId: string, volume: number): Promise<void>;
  setTrackPan(trackId: string, pan: number): Promise<void>;
  toggleMute(trackId: string): Promise<boolean>;
  toggleSolo(trackId: string): Promise<void>;
  setGlobalVolume(volume: number): Promise<void>;
  resetTrack(trackId: string): Promise<void>;
  resetAllTracks(): Promise<void>;
  saveConfig(): Promise<void>;
  loadConfig(songPath: string): Promise<void>;

  // Computed
  mutedTracks: AudioTrack[];
  soloedTracks: AudioTrack[];
  activeTracks: AudioTrack[];
}

/**
 * Timer ViewModel interface
 */
export interface ITimerViewModel extends IViewModel {
  // Observable state
  timers: Timer[];
  displays: Display[];
  selectedTimer: Timer | null;
  isLoading: boolean;
  error: string | null;
  showCreateModal: boolean;
  showEditModal: boolean;

  // Actions
  loadTimers(): Promise<void>;
  loadDisplays(): Promise<void>;
  createTimer(timer: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<boolean>;
  updateTimer(id: string, updates: Partial<Timer>): Promise<boolean>;
  deleteTimer(id: string): Promise<boolean>;
  startTimer(id: string): Promise<void>;
  pauseTimer(id: string): Promise<void>;
  stopTimer(id: string): Promise<void>;
  resetTimer(id: string): Promise<void>;
  selectTimer(timer: Timer | null): void;
  openCreateModal(): void;
  closeCreateModal(): void;
  openEditModal(timer: Timer): void;
  closeEditModal(): void;

  // Computed
  runningTimers: Timer[];
  hasTimers: boolean;
}
