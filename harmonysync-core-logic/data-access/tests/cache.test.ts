import { MemoryCacheProvider } from '../src/cache';

describe('MemoryCacheProvider', () => {
  let cache: MemoryCacheProvider;

  beforeEach(() => {
    cache = new MemoryCacheProvider(3); // Small size for testing eviction
  });

  test('should set and get values', async () => {
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    expect(value).toBe('value1');
  });

  test('should return null for non-existent keys', async () => {
    const value = await cache.get('nonexistent');
    expect(value).toBeNull();
  });

  test('should delete values', async () => {
    await cache.set('key1', 'value1');
    await cache.delete('key1');
    const value = await cache.get('key1');
    expect(value).toBeNull();
  });

  test('should clear all values', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.clear();
    expect(await cache.size()).toBe(0);
  });

  test('should respect TTL', async () => {
    jest.useFakeTimers();
    await cache.set('key1', 'value1', 1); // 1 second TTL
    
    expect(await cache.get('key1')).toBe('value1');
    
    jest.advanceTimersByTime(1500); // Advance 1.5 seconds
    
    expect(await cache.get('key1')).toBeNull();
    jest.useRealTimers();
  });

  test('should evict LRU items when reaching maxSize', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');
    
    // key1 is the oldest
    await cache.set('key4', 'value4');
    
    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBe('value2');
    expect(await cache.get('key3')).toBe('value3');
    expect(await cache.get('key4')).toBe('value4');
  });

  test('should update LRU order on get', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');
    
    // Access key1 to make it "newest"
    await cache.get('key1');
    
    // key2 is now the oldest
    await cache.set('key4', 'value4');
    
    expect(await cache.get('key2')).toBeNull();
    expect(await cache.get('key1')).toBe('value1');
  });

  test('should report correct size', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    expect(await cache.size()).toBe(2);
  });

  test('should clean expired entries during size()', async () => {
    jest.useFakeTimers();
    await cache.set('key1', 'value1', 1);
    await cache.set('key2', 'value2');
    
    jest.advanceTimersByTime(1500);
    
    expect(await cache.size()).toBe(1);
    jest.useRealTimers();
  });
});
