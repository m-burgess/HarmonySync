// Streaming audio functionality for individual track files
// This approach loads tracks as individual files for streaming playback

const audioBufferCache = new Map();

// Load a single track file for streaming playback
export async function loadTrackForStreaming(trackPath, trackName) {
  const cacheKey = `${trackPath}_${trackName}`;
  
  // Check cache first
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey);
  }

  try {
    const audioContext = getAudioContext();
    const assetUrl = TauriCore.convertFileSrc(trackPath);
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

// Create a streaming audio source for real-time playback
export function createStreamingSource(audioBuffer, audioContext) {
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
    setVolume: (volume) => { gainNode.gain.value = volume; },
    setPan: (pan) => { pannerNode.pan.value = pan; }
  };
}

// Load all tracks for a song for streaming playback
export async function loadSongTracksForStreaming(tracks) {
  const loadingPromises = tracks.map(async (trackInfo) => {
    try {
      let trackName = trackInfo.track_name || 'Unknown Track';
      
      // For the new streaming approach, each track has its own file path
      const audioBuffer = await loadTrackForStreaming(trackInfo.file_path, trackName);
      
      if (!audioBuffer) {
        console.error(`Failed to load streaming track: ${trackName}`);
        return null;
      }
      
      return {
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
  return results.filter(track => track !== null);
}

// Clear the streaming cache
export function clearStreamingCache() {
  audioBufferCache.clear();
  console.log('Streaming audio cache cleared');
}

// Get cache size for debugging
export function getStreamingCacheSize() {
  return audioBufferCache.size;
}

// Import required functions from existing audio.js
import { getAudioContext } from './audio.js';
import * as TauriCore from '@tauri-apps/api/core';