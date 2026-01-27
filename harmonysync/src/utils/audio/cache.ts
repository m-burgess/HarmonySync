/**
 * Integration helper for audio cache management
 * Provides easy access to cache management from frontend
 */

import { core } from '../../electron-adapter';
import type { CacheStats } from '../../types/audio';

/**
 * Get current cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
    try {
        const stats = await core.invoke('get_cache_stats_command');
        return stats as CacheStats;
    } catch (error) {
        console.error('[Cache] Failed to get stats:', error);
        return {
            count: 0,
            memory_bytes: 0,
            memory_mb: 0,
            max_cache_bytes: 536870912,
            max_cache_mb: 512.0
        };
    }
}

/**
 * Clear the entire audio cache
 * Use when importing new song versions or to free memory
 */
export async function clearCache(): Promise<void> {
    try {
        await core.invoke('clear_audio_cache_command');
        console.log('[Cache] Cleared successfully');
    } catch (error) {
        console.error('[Cache] Failed to clear:', error);
    }
}

/**
 * Remove a specific file from cache
 */
export async function removeFromCache(path: string): Promise<void> {
    try {
        await core.invoke('remove_from_cache_command', { path });
        console.log('[Cache] Removed:', path);
    } catch (error) {
        console.error('[Cache] Failed to remove:', error);
    }
}

/**
 * Monitor cache usage and log warnings
 * Call periodically to track cache health
 */
export async function monitorCache(): Promise<CacheStats> {
    const stats = await getCacheStats();
    const usagePercent = (stats.memory_mb / stats.max_cache_mb) * 100;
    
    console.log(`[Cache] ${stats.count} files, ${stats.memory_mb.toFixed(2)} MB / ${stats.max_cache_mb} MB (${usagePercent.toFixed(1)}%)`);
    
    if (usagePercent > 90) {
        console.warn('[Cache] Warning: Cache usage above 90%, eviction may occur soon');
    }
    
    return stats;
}

/**
 * Format cache size for display
 */
export function formatCacheSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

export default {
    getCacheStats,
    clearCache,
    removeFromCache,
    monitorCache,
    formatCacheSize
};
