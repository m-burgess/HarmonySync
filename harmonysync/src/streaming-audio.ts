// Streaming audio functionality for individual track files
// This approach loads tracks as individual files for streaming playback

import { getAudioContext } from './utils/audio/audio-nodejs';
import { core } from './electron-adapter';
import type { Track, TrackInfo } from './types/audio';

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

const audioBufferCache = new Map<string, AudioBuffer>();

/**
 * Load a single track file for streaming playback
 */
export async function loadTrackForStreaming(trackPath: string, trackName: string): Promise<AudioBuffer | null> {
  const cacheKey = `${trackPath}_${trackName}`;
  
  // Check cache first
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey)!;
  }

  try {
    const audioContext = getAudioContext();
    const assetUrl = core.convertFileSrc(trackPath);
    console.log(`Loading streaming track "${trackName}" from:`, assetUrl);
    
    const response = await fetch(assetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch track file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Cache the decoded buffer
    audioBufferCache.set(cacheKey, audioBuffer);
    console.log(`Successfully loaded streaming track: ${trackName}`);
    return audioBuffer;
  } catch (error) {
    console.error(`Error loading streaming track ${trackName} from ${trackPath}:`, error);
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
      
      // For the new streaming approach, each track has its own file path
      const audioBuffer = await loadTrackForStreaming(trackInfo.file_path, trackName);
      
      if (!audioBuffer) {
        console.error(`Failed to load streaming track: ${trackName}`);
        return null;
      }
      
      return {
        id: '', // Will be assigned by service
        name: trackName,
        buffer: audioBuffer,
        filePath: trackInfo.file_path,
        isPlaying: false,
        isPaused: false,
        panValue: 0,
        volume: 1.0,
        source: null,
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
  audioBufferCache.clear();
  console.log('Streaming audio cache cleared');
}

/**
 * Get cache size for debugging
 */
export function getStreamingCacheSize(): number {
  return audioBufferCache.size;
}
