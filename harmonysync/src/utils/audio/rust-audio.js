/**
 * Rust-powered audio decoder using Symphonia
 * Provides better performance and memory management than Web Audio API decoding
 */

import { core } from '../../electron-adapter';

/**
 * Decode an audio file using Rust's Symphonia decoder
 * @param {string} path - File path to decode
 * @returns {Promise<DecodedAudio>} Decoded audio data
 */
export async function decodeAudioFileRust(path) {
    console.log('[Rust Audio] Decoding:', path);
    const startTime = performance.now();
    
    try {
        const decoded = await core.invoke('decode_audio_file', { path });
        const duration = performance.now() - startTime;
        
        console.log(`[Rust Audio] Decoded ${path} in ${duration.toFixed(2)}ms`);
        console.log(`[Rust Audio] - Samples: ${decoded.samples.length}`);
        console.log(`[Rust Audio] - Channels: ${decoded.channels}`);
        console.log(`[Rust Audio] - Sample Rate: ${decoded.sample_rate}Hz`);
        console.log(`[Rust Audio] - Duration: ${decoded.duration.toFixed(2)}s`);
        
        return decoded;
    } catch (error) {
        console.error('[Rust Audio] Decode error:', error);
        throw error;
    }
}

/**
 * Get audio from cache or decode it (cached in Rust)
 * @param {string} path - File path
 * @returns {Promise<DecodedAudio>} Decoded audio data
 */
export async function getOrDecodeAudioRust(path) {
    console.log('[Rust Audio] Get or decode:', path);
    const startTime = performance.now();
    
    try {
        const decoded = await core.invoke('get_or_decode_audio', { path });
        const duration = performance.now() - startTime;
        
        console.log(`[Rust Audio] Retrieved ${path} in ${duration.toFixed(2)}ms`);
        
        return decoded;
    } catch (error) {
        console.error('[Rust Audio] Get/decode error:', error);
        throw error;
    }
}

/**
 * Convert decoded audio from Rust to Web Audio API AudioBuffer
 * @param {DecodedAudio} decodedAudio - Audio data from Rust
 * @param {AudioContext} audioContext - Web Audio context
 * @returns {AudioBuffer} AudioBuffer ready for playback
 */
export function convertToAudioBuffer(decodedAudio, audioContext) {
    const { samples, channels, sample_rate } = decodedAudio;
    
    const frameCount = samples.length / channels;
    const audioBuffer = audioContext.createBuffer(channels, frameCount, sample_rate);
    
    // De-interleave samples into separate channel buffers
    for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = samples[i * channels + channel];
        }
    }
    
    return audioBuffer;
}

/**
 * Load and decode an audio file using Rust, then create an AudioBuffer
 * This is a drop-in replacement for the current loadAudioFile function
 * @param {string} path - File path
 * @param {AudioContext} audioContext - Web Audio context
 * @returns {Promise<AudioBuffer>} AudioBuffer ready for playback
 */
export async function loadAudioFileRust(path, audioContext) {
    const decoded = await getOrDecodeAudioRust(path);
    return convertToAudioBuffer(decoded, audioContext);
}

/**
 * Clear the Rust audio cache
 */
export async function clearAudioCacheRust() {
    console.log('[Rust Audio] Clearing cache');
    await core.invoke('clear_audio_cache');
}

/**
 * Remove a specific file from the Rust audio cache
 * @param {string} path - File path to remove
 */
export async function removeFromAudioCacheRust(path) {
    console.log('[Rust Audio] Removing from cache:', path);
    await core.invoke('remove_from_audio_cache', { path });
}

/**
 * Get audio cache statistics
 * @returns {Promise<AudioCacheStats>} Cache statistics
 */
export async function getAudioCacheStatsRust() {
    const stats = await core.invoke('get_audio_cache_stats');
    console.log('[Rust Audio] Cache stats:', stats);
    return stats;
}

/**
 * TypeScript-style type definitions (for documentation)
 * 
 * @typedef {Object} DecodedAudio
 * @property {number[]} samples - Audio samples (f32, normalized to -1.0 to 1.0)
 * @property {number} channels - Number of channels
 * @property {number} sample_rate - Sample rate in Hz
 * @property {number} duration - Duration in seconds
 * @property {string} path - Original file path
 * 
 * @typedef {Object} AudioCacheStats
 * @property {number} count - Number of cached files
 * @property {number} memory_bytes - Total memory used in bytes
 * @property {number} memory_mb - Total memory used in megabytes
 */

export default {
    decodeAudioFileRust,
    getOrDecodeAudioRust,
    convertToAudioBuffer,
    loadAudioFileRust,
    clearAudioCacheRust,
    removeFromAudioCacheRust,
    getAudioCacheStatsRust,
};
