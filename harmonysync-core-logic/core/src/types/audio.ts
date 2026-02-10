/**
 * Audio Service Type Definitions
 * Shared types for audio service, mixer, and tracks
 */

// ==================== Audio Track Types ====================

export interface AudicInstance {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  destroy(): void;
  playing: boolean;
  paused: boolean;
  src: string;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface AudioTrackState {
  id: string;
  name: string;
  filePath: string;
  duration: number;
  channels: number;
  sampleRate: number;
  volume: number;
  pan: number;
  isMuted: boolean;
  isPlaying: boolean;
  currentPosition: number;
  isPreloaded: boolean;
  preloadStatus: 'pending' | 'loading' | 'ready' | 'error';
  preloadError?: string;
}

export interface WavDecodeResult {
  leftChannel: Float32Array | null;
  rightChannel: Float32Array | null;
}

// ==================== Audio Mixer Types ====================

export interface Song {
  id: string;
  name: string;
  trackIds: string[];
  isPlaying: boolean;
}

export interface SongState {
  id: string;
  name: string;
  isPlaying: boolean;
  trackCount: number;
  tracks: Array<{
    id: string;
    name: string;
    isPlaying: boolean;
    volume: number;
    pan: number;
    isMuted: boolean;
  }>;
}

export interface CrossfadeInfo {
  startTime: number;
  duration: number;
  oldTracks: string[];
  newTracks: string[];
  completed: boolean;
}

export interface MemoryUsageInfo {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MixerState {
  masterVolume: number;
  isPlaying: boolean;
  currentSongId: string | null;
  songs: (SongState | null)[];
  tracks: AudioTrackState[];
  memoryUsage: MemoryUsageInfo;
}

// ==================== Socket Event Data Types ====================

export interface LoadTrackData {
  filePath: string;
  name?: string;
}

export interface PlayTrackData {
  trackId: string;
}

export interface StopTrackData {
  trackId: string;
}

export interface SetTrackMuteData {
  trackId: string;
  muted: boolean;
}

export interface SetTrackPanData {
  trackId: string;
  pan: number;
}

export interface SetTrackVolumeData {
  trackId: string;
  volume: number;
}

export interface SetMasterVolumeData {
  volume: number;
}

export interface CreateSongData {
  name: string;
  trackIds: string[];
}

export interface PlaySongData {
  songId: string;
}

export interface StopSongData {
  songId: string;
}

export interface DeleteSongData {
  songId: string;
}

export interface CrossfadeSongsData {
  oldSongId: string;
  newSongId: string;
  duration?: number;
}

// ==================== REST API Request/Response Types ====================

export interface LoadTrackRequest {
  filePath: string;
  name?: string;
}

export interface LoadTrackResponse {
  trackId: string;
}

export interface TrackVolumeRequest {
  trackId?: string;
  trackIndex?: number;
  volume: number;
}

export interface TrackMuteRequest {
  trackId?: string;
  trackIndex?: number;
  muted: boolean;
}

export interface TrackPanRequest {
  trackId?: string;
  trackIndex?: number;
  pan: number;
}

export interface TrackActionResponse {
  success: boolean;
  message?: string;
}

export interface AudioHealthResponse {
  status: string;
  service: string;
  version: string;
  memoryUsage: MemoryUsageInfo;
}

export interface AudioErrorResponse {
  error: string;
  message?: string;
}

// ==================== Audio Service Events ====================

export type AudioServiceEvent =
  | 'mixer_state_changed'
  | 'track_loaded'
  | 'track_playing'
  | 'track_stopped'
  | 'track_error'
  | 'song_playing'
  | 'song_stopped'
  | 'crossfade_started'
  | 'crossfade_completed';

export interface AudioServiceEventData {
  'mixer_state_changed': { state: MixerState };
  'track_loaded': { trackId: string; name: string };
  'track_playing': { trackId: string };
  'track_stopped': { trackId: string };
  'track_error': { trackId?: string; error: string };
  'song_playing': { songId: string };
  'song_stopped': { songId: string };
  'crossfade_started': CrossfadeInfo;
  'crossfade_completed': { oldSongId: string; newSongId: string };
}
