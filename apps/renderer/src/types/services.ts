/**
 * Service interface definitions
 * These interfaces define the contracts for all service classes
 */

import type {
  AudioTrack,
  Display,
  DisplayWindow,
  FileSelectionResult,
  FolderSelectionResult,
  MemoryUsage,
  MixerConfig,
  Slide,
  Song,
  ServiceOrderFolder,
  TransposeResult,
} from './models';
import type { EventType, EventHandler, UnsubscribeFunction } from './events';

/**
 * Base service interface - all services implement this
 */
export interface IService {
  /**
   * Initialize the service
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources
   */
  dispose?(): void;
}

/**
 * IPC Service interface
 */
export interface IIpcService extends IService {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, callback: (...args: unknown[]) => void): UnsubscribeFunction;
  once(channel: string, callback: (...args: unknown[]) => void): void;
}

/**
 * EventBus Service interface
 */
export interface IEventBusService extends IService {
  subscribe<T = unknown>(eventType: EventType, handler: EventHandler<T>): UnsubscribeFunction;
  unsubscribe(eventType: EventType, handler: EventHandler): void;
  publish<T = unknown>(eventType: EventType, payload?: T): void;
  clear(eventType?: EventType): void;
  getHandlerCount(eventType: EventType): number;
  getRegisteredEvents(): string[];
  setDebug(enabled: boolean): void;
  getEventHistory(): Array<{ type: EventType; payload: unknown; timestamp: number }>;
  clearHistory(): void;
  once<T = unknown>(eventType: EventType, handler: EventHandler<T>): UnsubscribeFunction;
  waitFor<T = unknown>(eventType: EventType, timeout?: number): Promise<T>;
}

/**
 * Audio Service interface
 */
export interface IAudioService extends IService {
  loadTracks(folderPath: string): Promise<AudioTrack[]>;
  transpose(sourcePath: string, semitones: number): Promise<TransposeResult>;
  play(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  seek(position: number): Promise<void>;
  setTrackVolume(trackIndex: number, volume: number): Promise<void>;
  setTrackPan(trackIndex: number, pan: number): Promise<void>;
  muteTrack(trackIndex: number, muted: boolean): Promise<void>;
  setGlobalVolume(volume: number): Promise<void>;
  saveMixerConfig(config: MixerConfig): Promise<void>;
  loadMixerConfig(songPath: string): Promise<MixerConfig | null>;
  initializeAudioService(): Promise<void>;
  startAudioService(): Promise<void>;
  startAudioServiceFromApp(): Promise<unknown>;
  getMemoryUsage(): Promise<MemoryUsage>;
  startMemoryMonitoring(interval: number, callback: (usage: MemoryUsage) => void): void;
  stopMemoryMonitoring(): void;
  cleanup(): Promise<void>;
  playAllTracks(): Promise<void>;
  stopAllAudio(): Promise<void>;
  goToBeginningAllTracks(): Promise<void>;
  clearTracks(): Promise<void>;
  addTracks(trackPaths: string[]): Promise<unknown[]>;
  onPositionUpdate(callback: (event: unknown, position: number) => void): void;
  onDurationUpdate(callback: (event: unknown, duration: number) => void): void;
  onStateChange(callback: (event: unknown, state: { isPlaying: boolean; isPaused: boolean }) => void): void;
  onPlaybackStarted(callback: (event: unknown) => void): void;
  onPlaybackStopped(callback: (event: unknown) => void): void;
  onPlaybackPaused(callback: (event: unknown) => void): void;
  onTransposeProgress(callback: (event: unknown, progress: unknown) => void): void;
  onTransposeComplete(callback: (event: unknown, result: TransposeResult) => void): void;
  onTransposeError(callback: (event: unknown, error: Error) => void): void;
}

/**
 * File Service interface
 */
export interface IFileService extends IService {
  selectFolder(title?: string): Promise<FolderSelectionResult>;
  selectFile(title?: string, filters?: Array<{ name: string; extensions: string[] }>): Promise<FileSelectionResult>;
  selectFolders(title?: string): Promise<string[] | null>;
  readTextFile(filePath: string): Promise<string>;
  writeTextFile(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getSongFolders(basePath: string): Promise<ServiceOrderFolder[]>;
  getAudioFiles(folderPath: string): Promise<string[]>;
  getSlideFiles(folderPath: string): Promise<string[]>;
}

/**
 * Display Service interface
 */
export interface IDisplayService extends IService {
  getDisplays(): Promise<Display[]>;
  openWindow(type: DisplayWindow['type'], displayId: string): Promise<void>;
  closeWindow(type: DisplayWindow['type']): Promise<void>;
  getWindowConfig(type: DisplayWindow['type']): Promise<DisplayWindow | null>;
  setWindowBounds(type: DisplayWindow['type'], bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  clearAll(): Promise<void>;
  showSlide(slide: Slide): Promise<void>;
  displayVideoSlide(path: string, duration?: number): Promise<void>;
}

/**
 * Slide Service interface
 */
export interface ISlideService extends IService {
  loadSlides(folderPath: string): Promise<Slide[]>;
  loadFromFolder(folderPath: string): Promise<{ slides: unknown[]; tracks: unknown[] }>;
  importSlide(content: string): Promise<Slide>;
  saveSlide(slide: Slide): Promise<void>;
  deleteSlide(slideId: string): Promise<void>;
  reorderSlides(slideIds: string[]): Promise<void>;
  displaySlide(slideId: string, displayId: string): Promise<void>;
  clearDisplay(displayId: string): Promise<void>;
}

/**
 * Service Order Service interface
 */
export interface IServiceOrderService extends IService {
  loadServiceOrder(basePath: string): Promise<ServiceOrderFolder[]>;
  addFolder(folderPath: string): Promise<ServiceOrderFolder>;
  removeFolder(folderPath: string): Promise<void>;
  getSongDetails(songPath: string): Promise<Song>;
  saveSong(song: Song): Promise<void>;
  searchSongs(query: string): Promise<Song[]>;
  selectFolders(): Promise<string[] | null>;
  pathExistsInServiceOrder(serviceOrder: ServiceOrderFolder[], path: string): boolean;
  loadSongMetadata(folderPath: string): Promise<ServiceOrderFolder>;
  loadLyrics(songPath: string): Promise<string | null>;
  openLyricsFile(songPath: string): Promise<void>;
}
