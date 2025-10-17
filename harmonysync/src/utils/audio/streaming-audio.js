
// Streaming audio functionality for individual track files
// This approach loads tracks as individual files for streaming playback

// Cache audio elements (by path) to avoid recreating them
const audioElementCache = new Map();

// Simple in-memory caches for preloaded tracks
const DECODED_CACHE = new Map(); // assetUrl -> AudioBuffer
const STREAMING_CACHE = new Map(); // assetUrl -> HTMLAudioElement

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
		// Use 'auto' to preload the audio data so it's ready to play
		audioEl.preload = 'auto';
		audioEl.crossOrigin = 'anonymous';

		// Wait for the audio to be ready to play
		await new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`Timeout loading ${trackName}`));
			}, 10000); // 10 second timeout

			audioEl.addEventListener('canplaythrough', () => {
				clearTimeout(timeoutId);
				resolve();
			}, { once: true });

			audioEl.addEventListener('error', (e) => {
				clearTimeout(timeoutId);
				reject(new Error(`Error loading ${trackName}: ${e.message || 'Unknown error'}`));
			}, { once: true });

			// Start loading
			audioEl.load();
		});

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

/**
 * Preload a track by fetching and optionally decoding it.
 * @param {string} assetUrl - The asset URL to preload
 * @param {object} options - Configuration options
 * @param {boolean} options.decode - If true, decode into AudioBuffer (high memory), else just fetch and cache ArrayBuffer (medium memory)
 * @param {number} options.timeout - Timeout in ms for fetch (default: 30000)
 * @returns {Promise<void>}
 */
export async function preloadTrack(assetUrl, { decode = false, timeout = 30000 } = {}) {
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
      // This is more reliable than Audio elements in Tauri and uses less memory than decoding
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
 * @param {string} assetUrl - The asset URL
 * @returns {AudioBuffer | null}
 */
export function getPreloadedDecoded(assetUrl) {
  return DECODED_CACHE.get(assetUrl) || null;
}

/**
 * Get a preloaded ArrayBuffer from cache (can be decoded on demand)
 * @param {string} assetUrl - The asset URL
 * @returns {ArrayBuffer | null}
 */
export function getPreloadedStream(assetUrl) {
  return STREAMING_CACHE.get(assetUrl) || null;
}

/**
 * Clear all preload caches
 */
export function clearPreloadCaches() {
  DECODED_CACHE.clear();
  STREAMING_CACHE.clear();
  console.log('[clearPreloadCaches] All preload caches cleared');
}

// Import required functions from existing audio.js
import { getAudioContext } from './audio.js';
import * as TauriCore from '@tauri-apps/api/core';

