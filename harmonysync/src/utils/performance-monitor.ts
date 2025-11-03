// Performance Monitoring Example for HarmonySync Frontend
// This file shows how to use the performance metrics API

import React from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Performance metrics returned from the backend
 */
interface PerformanceMetrics {
  cpu_count: number;
  memory_available_mb: number;
  cache_sizes: {
    audio_cache_count: number;
    audio_cache_size_mb: number;
    http_server_active: boolean;
  };
  uptime_seconds: number;
}

/**
 * Fetch current performance metrics from the backend
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  try {
    const metrics = await invoke<PerformanceMetrics>('get_performance_metrics');
    return metrics;
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    throw error;
  }
}

/**
 * Display performance metrics in the console
 */
export async function logPerformanceMetrics(): Promise<void> {
  const metrics = await getPerformanceMetrics();
  
  console.group('🚀 HarmonySync Performance Metrics');
  console.log(`CPU Cores: ${metrics.cpu_count}`);
  console.log(`Available Memory: ${metrics.memory_available_mb} MB`);
  console.log(`Audio Cache: ${metrics.cache_sizes.audio_cache_count} files (${metrics.cache_sizes.audio_cache_size_mb.toFixed(2)} MB)`);
  console.log(`HTTP Server: ${metrics.cache_sizes.http_server_active ? '✅ Active' : '❌ Inactive'}`);
  console.log(`Uptime: ${formatUptime(metrics.uptime_seconds)}`);
  console.groupEnd();
}

/**
 * Format uptime in a human-readable format
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Performance monitoring component hook
 * Usage in React:
 * 
 * import { usePerformanceMonitor } from './utils/performance-monitor';
 * 
 * function MyComponent() {
 *   const metrics = usePerformanceMonitor({ interval: 5000 });
 *   
 *   return (
 *     <div>
 *       <p>CPU Cores: {metrics?.cpu_count}</p>
 *       <p>Memory: {metrics?.memory_available_mb} MB</p>
 *     </div>
 *   );
 * }
 */
export function usePerformanceMonitor(options?: { interval?: number }): PerformanceMetrics | null {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const interval = options?.interval ?? 10000; // Default: 10 seconds
  
  React.useEffect(() => {
    // Initial fetch
    getPerformanceMetrics().then(setMetrics).catch(console.error);
    
    // Set up periodic updates
    const timer = setInterval(() => {
      getPerformanceMetrics().then(setMetrics).catch(console.error);
    }, interval);
    
    return () => clearInterval(timer);
  }, [interval]);
  
  return metrics;
}

// Example: Monitor performance on app start
export async function initializePerformanceMonitoring(): Promise<void> {
  console.log('🔍 Initializing performance monitoring...');
  
  try {
    await logPerformanceMetrics();
    
    // Set up periodic monitoring (every 30 seconds)
    setInterval(async () => {
      const metrics = await getPerformanceMetrics();
      
      // Warn if memory is low
      if (metrics.memory_available_mb < 512) {
        console.warn('⚠️ Low memory available:', metrics.memory_available_mb, 'MB');
      }
      
      // Log cache size if it's large
      if (metrics.cache_sizes.audio_cache_size_mb > 500) {
        console.info('ℹ️ Large audio cache:', metrics.cache_sizes.audio_cache_size_mb.toFixed(2), 'MB');
      }
    }, 30000);
    
  } catch (error) {
    console.error('Failed to initialize performance monitoring:', error);
  }
}
