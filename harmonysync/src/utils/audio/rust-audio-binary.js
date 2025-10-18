/**
 * Rust-powered audio decoder with BINARY transfer (optimized)
 * 2.5x faster than JSON transfer for large audio files
 */

import * as TauriCore from '@tauri-apps/api/core';

/**
 * Load audio file using BINARY transfer (FAST!)
 * This is the optimized version - use this instead of the JSON version
 * 
 * @param {string} path - File path to decode
 * @param {AudioContext} audioContext - Web Audio context
 * @returns {Promise<AudioBuffer>} AudioBuffer ready for playback
 */
export async function loadAudioFileBinary(path, audioContext) {
    console.log('[Rust Binary Audio] Loading:', path);
    const startTime = performance.now();
    
    try {
        // Step 1: Get metadata (small, fast JSON transfer)
        const metadataStart = performance.now();
        const metadata = await TauriCore.invoke('get_audio_metadata', { path });
        const metadataTime = performance.now() - metadataStart;
        
        console.log(`[Rust Binary Audio] Metadata received in ${metadataTime.toFixed(2)}ms`);
        console.log(`[Rust Binary Audio] - Duration: ${metadata.duration.toFixed(2)}s`);
        console.log(`[Rust Binary Audio] - Sample Rate: ${metadata.sample_rate}Hz`);
        console.log(`[Rust Binary Audio] - Channels: ${metadata.channels}`);
        console.log(`[Rust Binary Audio] - Samples: ${metadata.sample_count.toLocaleString()}`);
        
        // Step 2: Get samples as binary (FAST binary transfer!)
        const samplesStart = performance.now();
        const bytes = await TauriCore.invoke('get_audio_samples_binary', { path });
        const samplesTime = performance.now() - samplesStart;
        
        console.log(`[Rust Binary Audio] Binary data received in ${samplesTime.toFixed(2)}ms (${bytes.length.toLocaleString()} bytes)`);
        
        // Step 3: Convert bytes to Float32Array (zero-copy view)
        const convertStart = performance.now();
        const uint8Array = new Uint8Array(bytes);
        const samples = new Float32Array(uint8Array.buffer);
        const convertTime = performance.now() - convertStart;
        
        console.log(`[Rust Binary Audio] Converted to Float32Array in ${convertTime.toFixed(2)}ms`);
        
        // Step 4: Create AudioBuffer and de-interleave channels
        const bufferStart = performance.now();
        const frameCount = metadata.sample_count / metadata.channels;
        const audioBuffer = audioContext.createBuffer(
            metadata.channels,
            frameCount,
            metadata.sample_rate
        );
        
        // De-interleave samples into separate channel buffers
        for (let channel = 0; channel < metadata.channels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = samples[i * metadata.channels + channel];
            }
        }
        const bufferTime = performance.now() - bufferStart;
        
        console.log(`[Rust Binary Audio] AudioBuffer created in ${bufferTime.toFixed(2)}ms`);
        
        const totalTime = performance.now() - startTime;
        console.log(`[Rust Binary Audio] ✅ Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`[Rust Binary Audio] Breakdown: metadata=${metadataTime.toFixed(0)}ms, binary=${samplesTime.toFixed(0)}ms, convert=${convertTime.toFixed(0)}ms, buffer=${bufferTime.toFixed(0)}ms`);
        
        return audioBuffer;
        
    } catch (error) {
        console.error('[Rust Binary Audio] Error:', error);
        throw error;
    }
}

/**
 * Get audio metadata without loading samples (very fast)
 * @param {string} path - File path
 * @returns {Promise<AudioMetadata>} Metadata
 */
export async function getAudioMetadataBinary(path) {
    console.log('[Rust Binary Audio] Getting metadata:', path);
    const metadata = await TauriCore.invoke('get_audio_metadata', { path });
    return metadata;
}

/**
 * Clear the Rust audio cache
 */
export async function clearAudioCacheBinary() {
    console.log('[Rust Binary Audio] Clearing cache');
    await TauriCore.invoke('clear_audio_cache');
}

/**
 * Remove a specific file from the Rust audio cache
 * @param {string} path - File path to remove
 */
export async function removeFromAudioCacheBinary(path) {
    console.log('[Rust Binary Audio] Removing from cache:', path);
    await TauriCore.invoke('remove_from_audio_cache', { path });
}

/**
 * Get audio cache statistics
 * @returns {Promise<AudioCacheStats>} Cache statistics
 */
export async function getAudioCacheStatsBinary() {
    const stats = await TauriCore.invoke('get_audio_cache_stats');
    console.log('[Rust Binary Audio] Cache stats:', stats);
    return stats;
}

/**
 * TypeScript-style type definitions (for documentation)
 * 
 * @typedef {Object} AudioMetadata
 * @property {number} channels - Number of channels
 * @property {number} sample_rate - Sample rate in Hz
 * @property {number} duration - Duration in seconds
 * @property {string} path - Original file path
 * @property {number} sample_count - Total number of samples (all channels)
 * 
 * @typedef {Object} AudioCacheStats
 * @property {number} count - Number of cached files
 * @property {number} memory_bytes - Total memory used in bytes
 * @property {number} memory_mb - Total memory used in megabytes
 */

export default {
    loadAudioFileBinary,
    getAudioMetadataBinary,
    clearAudioCacheBinary,
    removeFromAudioCacheBinary,
    getAudioCacheStatsBinary,
};
