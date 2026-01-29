/**
 * Core domain models for HarmonySync
 * These types represent the main entities in the application
 */

/**
 * Audio Track representation
 */
export interface AudioTrack {
  id: string;
  name: string;
  path: string;
  duration: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo?: boolean;
  waveform?: number[];
}

/**
 * Slide/Lyric representation
 */
export interface Slide {
  id: string;
  title: string;
  content: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  order: number;
}

/**
 * Song in service order
 */
export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  duration?: number;
  folderPath: string;
  slidesPath?: string;
  audioPath?: string;
  hasAudio: boolean;
  hasSlides: boolean;
  tags?: string[];
}

/**
 * Service order folder
 */
export interface ServiceOrderFolder {
  name: string;
  path: string;
  songs: Song[];
}

/**
 * Display/Monitor configuration
 */
export interface Display {
  id: string;
  name: string;
  isPrimary: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Display window configuration
 */
export interface DisplayWindow {
  type: 'audience' | 'confidence' | 'lowerthirds' | 'preservice-music';
  displayId: string;
  isOpen: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Mixer configuration for a song
 */
export interface MixerConfig {
  songPath: string;
  tracks: {
    volume: number;
    pan: number;
    muted: boolean;
  }[];
  globalVolume: number;
  timestamp: number;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Transpose operation result
 */
export interface TransposeResult {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Transpose progress information
 */
export interface TransposeProgress {
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
  message: string;
}

/**
 * File selection result
 */
export interface FileSelectionResult {
  canceled: boolean;
  filePaths: string[];
}

/**
 * Folder selection result
 */
export interface FolderSelectionResult {
  canceled: boolean;
  filePaths: string[];
}
