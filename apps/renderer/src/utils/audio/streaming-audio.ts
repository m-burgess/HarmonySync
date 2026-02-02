// Streaming audio functionality for individual track files
// This approach loads tracks as individual files for streaming playback

import { getAudioContext } from './audio-nodejs';
import type { Track, TrackInfo } from '../../types/audio';

/**
 * Streaming track wrapper with audio element
 */
interface StreamingTrackWrapper {
  audioEl: HTMLAudioElement;
  filePath: string;
  name: string;
}

/**
 * Streaming source with Web Audio nodes
 */
interface StreamingSource {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  start: (when?: number) => void;
  stop: (when?: number) => void;
  setVolume: (volume: number) => void;
  setPan: (pan: number) => void;
}

// Cache audio elements (by path) to avoid recreating them
const audioElementCache = new Map<string, StreamingTrackWrapper>();

// Simple in-memory caches for preloaded tracks
const DECODED_CACHE = new Map<string, AudioBuffer>(); // assetUrl -> AudioBuffer
const STREAMING_CACHE = new Map<string, ArrayBuffer>(); // assetUrl -> ArrayBuffer

/**
 * Load a single track file for streaming playback
 */
export async function loadTrackForStreaming(
  trackPath: string,
  trackName: string
): Promise<StreamingTrackWrapper | null> {
  const cacheKey = `${trackPath}`;

  if (audioElementCache.has(cacheKey)) {
    return audioElementCache.get(cacheKey)!;
  }

  try {
    const assetUrl = trackPath; // In Electron, use path directly
    console.log(`Creating audio element for streaming track "${trackName}" from:`, assetUrl);

    const audioEl = new Audio();
    audioEl.src = assetUrl;
    // Let the browser decide how much to preload; we can set 'metadata' or 'auto'
    audioEl.preload = 'metadata';
    audioEl.crossOrigin = 'anonymous';

    // Return a small wrapper once element is usable
    const wrapper: StreamingTrackWrapper = { audioEl, filePath: trackPath, name: trackName };
    audioElementCache.set(cacheKey, wrapper);
    console.log(`Created streaming audio element for: ${trackName}`);
    return wrapper;
  } catch (error) {
    console.error(`Error creating audio element for ${trackName} from ${trackPath}:`, error);
    return null;
  }
}

/**
 * Create a streaming audio source for real-time playback
 */
export function createStreamingSource(
  audioBuffer: AudioBuffer | null,
  audioContext: AudioContext | null
): StreamingSource | null {
  if (!audioBuffer || !audioContext) {
    return null;
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create gain node for volume control
  const gainNode = audioContext.createGain();
  source.connect(gainNode);

  // Create panner for stereo positioning
  const pannerNode = audioContext.createStereoPanner();
  gainNode.connect(pannerNode);

  return {
    source,
    gainNode,
    pannerNode,
    start: (when = 0) => source.start(when),
    stop: (when = 0) => source.stop(when),
    setVolume: (volume: number) => { gainNode.gain.value = volume; },
    setPan: (pan: number) => { pannerNode.pan.value = pan; }
  };
}

/**
 * Load all tracks for a song for streaming playback
 */
export async function loadSongTracksForStreaming(tracks: TrackInfo[]): Promise<Track[]> {
  const loadingPromises = tracks.map(async (trackInfo): Promise<Track | null> => {
    try {
      const trackName = trackInfo.track_name || 'Unknown Track';

      // For streaming now we create an HTMLAudioElement wrapper
      const mediaWrapper = await loadTrackForStreaming(trackInfo.file_path, trackName);
      if (!mediaWrapper) {
        console.error(`Failed to create media element for: ${trackName}`);
        return null;
      }

      return {
        name: trackName,
        id: '', // Will be assigned by service
        audioEl: mediaWrapper.audioEl,
        filePath: mediaWrapper.filePath,
        isPlaying: false,
        isPaused: false,
        panValue: 0,
        volume: 1.0,
        source: null, // will be MediaElementAudioSourceNode when connected
        gainNode: null,
        pannerNode: null
      };
    } catch (error) {
      console.error(`Error loading streaming track ${trackInfo.track_name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(loadingPromises);
  return results.filter((track): track is Track => track !== null);
}

/**
 * Clear the streaming cache
 */
export function clearStreamingCache(): void {
  audioElementCache.clear();
  console.log('Streaming audio cache cleared');
}

/**
 * Get cache size for debugging
 */
export function getStreamingCacheSize(): number {
  return audioElementCache.size;
}

/**
 * Preload options
 */
interface PreloadOptions {
  decode?: boolean;
  timeout?: number;
}

/**
 * Preload a track by fetching and optionally decoding it.
 */
export async function preloadTrack(
  assetUrl: string,
  { decode = false }: PreloadOptions = {}
): Promise<void> {
  if (!assetUrl) {
    throw new Error('assetUrl is required for preload');
  }

  if (decode) {
    // Check if already decoded and cached
    if (DECODED_CACHE.has(assetUrl)) {
      console.log(`[preloadTrack] Already cached (decoded): ${assetUrl}`);
      return;
    }

    console.log(`[preloadTrack] Fetching and decoding: ${assetUrl}`);

    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${assetUrl}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioContext = getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      DECODED_CACHE.set(assetUrl, audioBuffer);
      console.log(`[preloadTrack] Decoded and cached: ${assetUrl} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error(`[preloadTrack] Error decoding ${assetUrl}:`, error);
      throw error;
    }
  } else {
    // Check if already in streaming cache (as ArrayBuffer, not decoded)
    if (STREAMING_CACHE.has(assetUrl)) {
      console.log(`[preloadTrack] Already cached (streaming): ${assetUrl}`);
      return;
    }

    console.log(`[preloadTrack] Fetching for streaming cache: ${assetUrl}`);

    try {
      // Fetch the audio file and store as ArrayBuffer
      // Streaming audio uses less memory than decoding the entire file at once
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${assetUrl}: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      STREAMING_CACHE.set(assetUrl, arrayBuffer);
      console.log(`[preloadTrack] Cached for streaming: ${assetUrl} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error(`[preloadTrack] Error fetching ${assetUrl}:`, error);
      throw error;
    }
  }
}

/**
 * Get a preloaded decoded AudioBuffer from cache
 */
export function getPreloadedDecoded(assetUrl: string): AudioBuffer | null {
  return DECODED_CACHE.get(assetUrl) || null;
}

/**
 * Get a preloaded ArrayBuffer from cache (can be decoded on demand)
 */
export function getPreloadedStream(assetUrl: string): ArrayBuffer | null {
  return STREAMING_CACHE.get(assetUrl) || null;
}

/**
 * Clear all preload caches
 */
export function clearPreloadCaches(): void {
  DECODED_CACHE.clear();
  STREAMING_CACHE.clear();
  console.log('[clearPreloadCaches] All preload caches cleared');
}
