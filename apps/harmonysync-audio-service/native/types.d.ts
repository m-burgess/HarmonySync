/**
 * TypeScript type definitions for harmonysync-audio-native module
 * 
 * This module provides native C++ audio buffer management for
 * high-performance, low-latency audio processing.
 */

declare module 'harmonysync-audio-native' {
    /**
     * Statistics about the current state of the buffer pool
     */
    export interface BufferPoolStats {
        /** Total number of buffers allocated in the pool */
        totalBuffers: number;
        
        /** Number of buffers currently available for use */
        availableBuffers: number;
        
        /** Total number of buffers ever allocated (including overflow) */
        allocatedBuffers: number;
        
        /** Number of buffers currently acquired by JavaScript */
        activeBuffers: number;
    }

    /**
     * Native audio buffer pool for efficient memory management
     * 
     * Manages a pool of pre-allocated audio buffers to avoid real-time
     * allocation during audio processing. Buffers are returned as Float32Array
     * for zero-copy integration with Web Audio API and audio processing code.
     * 
     * @example
     * ```typescript
     * import { AudioBufferPool } from 'harmonysync-audio-native';
     * 
     * // Create pool with 16 buffers, 4096 frames each, stereo (2 channels)
     * const pool = new AudioBufferPool(16, 4096, 2);
     * 
     * // Acquire a buffer for processing
     * const buffer = pool.acquireBuffer();
     * // buffer is a Float32Array with 8192 samples (4096 frames * 2 channels)
     * 
     * // Process audio...
     * for (let i = 0; i < buffer.length; i++) {
     *     buffer[i] *= 0.5; // Example: reduce volume by half
     * }
     * 
     * // Return buffer to pool when done
     * pool.releaseBuffer(buffer);
     * 
     * // Get pool statistics
     * const stats = pool.getStats();
     * console.log(`Available: ${stats.availableBuffers}/${stats.totalBuffers}`);
     * 
     * // Clean up when done
     * pool.destroy();
     * ```
     */
    export class AudioBufferPool {
        /**
         * Create a new audio buffer pool
         * 
         * @param numBuffers - Number of buffers to pre-allocate (1-1024)
         * @param bufferSizeFrames - Size of each buffer in audio frames (1-1048576)
         * @param channels - Number of audio channels per buffer (1-32, typically 2 for stereo)
         * 
         * @throws {TypeError} If any argument is not a number
         * @throws {RangeError} If any argument is outside valid range
         * @throws {Error} If pool creation fails (e.g., out of memory)
         */
        constructor(numBuffers: number, bufferSizeFrames: number, channels: number);

        /**
         * Acquire a buffer from the pool
         * 
         * Returns a Float32Array containing interleaved audio samples.
         * For stereo (2 channels), the format is: [L, R, L, R, ...]
         * 
         * The returned buffer is zeroed before being returned.
         * 
         * If all buffers are in use, a new buffer will be allocated
         * (may cause memory allocation - avoid in real-time contexts).
         * 
         * @returns Float32Array buffer with size = bufferSizeFrames * channels
         * 
         * @throws {Error} If the pool has been destroyed
         */
        acquireBuffer(): Float32Array;

        /**
         * Return a buffer to the pool
         * 
         * Makes the buffer available for reuse. After calling this method,
         * you should not use the buffer anymore as it may be reused.
         * 
         * @param buffer - The Float32Array buffer to return
         * 
         * @throws {TypeError} If buffer is not a Float32Array
         */
        releaseBuffer(buffer: Float32Array): void;

        /**
         * Get pool statistics
         * 
         * @returns Current statistics about the buffer pool
         * 
         * @throws {Error} If the pool has been destroyed
         */
        getStats(): BufferPoolStats;

        /**
         * Destroy the buffer pool and free all resources
         * 
         * After calling this method, the pool cannot be used anymore.
         * All acquired buffers will be released automatically.
         * 
         * It's good practice to call this when you're done with the pool
         * to ensure proper cleanup, though Node.js will eventually
         * garbage collect the resources.
         */
        destroy(): void;
    }
}
