/**
 * In-Memory Cache Provider
 * 
 * Simple LRU cache for frequently accessed data
 */

import { ICacheProvider } from './interfaces';

interface CacheEntry<T> {
  value: T;
  expiry?: number;
}

export class MemoryCacheProvider implements ICacheProvider {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    const entry: CacheEntry<T> = {
      value,
      expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined
    };
    
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async size(): Promise<number> {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}
