/**
 * Audio-specific type definitions for HarmonySync
 * These types are used across audio utilities and services
 */

import type { MemoryUsage } from './models';

/**
 * Cache statistics from audio service
 */
export interface CacheStats {
  count: number;
  memory_bytes: number;
  memory_mb: number;
  max_cache_bytes: number;
  max_cache_mb: number;
}

/**
 * Audio track in the mixer
 */
export interface Track {
  id: string;
  name: string;
  filePath: string;
  isPlaying: boolean;
  isPaused: boolean;
  panValue: number;
  volume: number;
  isMuted?: boolean;
  // Web Audio API nodes (optional)
  source?: AudioBufferSourceNode | MediaElementAudioSourceNode | null;
  gainNode?: GainNode | null;
  pannerNode?: StereoPannerNode | null;
  // Audio elements for streaming
  audioEl?: HTMLAudioElement | null;
  buffer?: AudioBuffer | null;
  individualVolume?: number;
}

/**
 * Mixer state from audio service
 */
export interface MixerState {
  tracks: Track[];
  memoryUsage: MemoryUsage;
  masterVolume?: number;
}

/**
 * Service health/status response
 */
export interface ServiceStatus {
  isRunning: boolean;
  memoryUsage?: MemoryUsage;
  version?: string;
  error?: string;
}

/**
 * Job status for async operations
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Job information for image/video processing services
 */
export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  result?: unknown;
  error?: string;
}

/**
 * Health check response from services
 */
export interface HealthResponse {
  status: string;
  memoryUsage: MemoryUsage;
  version: string;
}

/**
 * Load track response
 */
export interface LoadTrackResponse {
  trackId: string;
  message?: string;
}

/**
 * Crossfade request body
 */
export interface CrossfadeRequest {
  trackPaths: string[];
  duration?: number | null;
}

/**
 * Crossfade status
 */
export interface CrossfadeStatus {
  isActive: boolean;
  progress?: number;
  duration?: number;
}

/**
 * Video metadata
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec?: string;
  bitrate?: number;
  fps?: number;
}

/**
 * Lyric slide content
 */
export interface LyricSlide {
  text: string[];
  section: string;
  type: 'lyric';
}

/**
 * Image content for display
 */
export interface ImageContent {
  type: 'image';
  path: string;
  name: string;
}

/**
 * Lyrics content for display
 */
export interface LyricsContent {
  type: 'lyrics';
  text: string[];
}

/**
 * Display content (union type)
 */
export type DisplayContent = LyricsContent | ImageContent | null;

/**
 * Transition status
 */
export interface TransitionStatus {
  isTransitioning: boolean;
  transitionDuration: number;
  hasContent: boolean;
  hasPendingContent: boolean;
}

/**
 * Song details for transitions
 */
export interface SongDetails {
  id?: string;
  path?: string;
  name: string;
  tracks: Array<{
    track_name?: string;
    file_path: string;
  }>;
}

/**
 * Streaming track wrapper
 */
export interface StreamingTrack extends Track {
  audioEl: HTMLAudioElement;
}

/**
 * Track info from song
 */
export interface TrackInfo {
  track_name?: string;
  file_path: string;
}

/**
 * Formatted memory usage for UI display
 */
export interface FormattedMemoryUsage {
  rss: string;
  heapUsed: string;
  heapTotal: string;
  total: string;
}

/**
 * Formatted mixer state for UI
 */
export interface FormattedMixerState extends MixerState {
  memoryUsageFormatted: FormattedMemoryUsage;
  tracksCount: number;
  playingTracksCount: number;
}

/**
 * Startup instructions for services
 */
export interface StartupInstructions {
  title: string;
  message: string;
  instructions: string[];
  commands: string[];
}

/**
 * Song create request
 */
export interface CreateSongRequest {
  name: string;
  trackPaths: string[];
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Fade type for transitions
 */
export type FadeType = 'linear' | 'logarithmic' | 'scurve';

/**
 * Transition type
 */
export type TransitionType = 'crossfade' | 'cut';

/**
 * Preloaded song data
 */
export interface PreloadedSong {
  details: SongDetails;
  tracks: Track[];
  loadedAt: number;
}

/**
 * Batch track load result
 */
export interface BatchTrackResult {
  path: string;
  trackId?: string;
  error?: string;
  success: boolean;
}
