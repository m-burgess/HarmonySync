import { useState, useEffect } from 'react';
import { getCacheStats } from '../utils/audio/cache';

/**
 * React hook for monitoring audio cache
 * @param {number} pollInterval - How often to check cache (ms), default 10000 (10s)
 * @returns {Object} Cache statistics
 */
export function useAudioCache(pollInterval = 10000) {
    const [cacheStats, setCacheStats] = useState({
        count: 0,
        memory_bytes: 0,
        memory_mb: 0,
        max_cache_bytes: 536870912,
        max_cache_mb: 512.0
    });

    useEffect(() => {
        // Initial fetch
        getCacheStats().then(setCacheStats);

        // Poll for updates
        const interval = setInterval(() => {
            getCacheStats().then(setCacheStats);
        }, pollInterval);

        return () => clearInterval(interval);
    }, [pollInterval]);

    const usagePercent = (cacheStats.memory_mb / cacheStats.max_cache_mb) * 100;
    const isNearLimit = usagePercent > 80;

    return {
        ...cacheStats,
        usagePercent,
        isNearLimit
    };
}

export default useAudioCache;
