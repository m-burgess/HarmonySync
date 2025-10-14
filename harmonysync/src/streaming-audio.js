// Streaming audio functionality for individual track files
// This approach loads tracks as individual files for streaming playback

// Cache audio elements (by path) to avoid recreating them
const audioElementCache = new Map();

// Load a single track file for streaming playback
export async function loadTrackForStreaming(trackPath, trackName) {
  const cacheKey = `${trackPath}`;

  if (audioElementCache.has(cacheKey)) {
    return audioElementCache.get(cacheKey);
  }

  try {
    const assetUrl = TauriCore.convertFileSrc(trackPath);
    console.log(`Creating audio element for streaming track "${trackName}" from:`, assetUrl);

    const audioEl = new Audio();
    audioEl.src = assetUrl;
    // Let the browser decide how much to preload; we can set 'metadata' or 'auto'
    audioEl.preload = 'metadata';
    audioEl.crossOrigin = 'anonymous';

    // Return a small wrapper once element is usable
    const wrapper = { audioEl, filePath: trackPath, name: trackName };
    audioElementCache.set(cacheKey, wrapper);
    console.log(`Created streaming audio element for: ${trackName}`);
    return wrapper;
  } catch (error) {
    console.error(`Error creating audio element for ${trackName} from ${trackPath}:`, error);
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
      
      // For streaming now we create an HTMLAudioElement wrapper
      const mediaWrapper = await loadTrackForStreaming(trackInfo.file_path, trackName);
      if (!mediaWrapper) {
        console.error(`Failed to create media element for: ${trackName}`);
        return null;
      }

      return {
        name: trackName,
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