# Audio Cache Management

## Overview

HarmonySync uses an intelligent audio caching system to optimize memory usage when loading and playing songs. This document explains how the cache works and how to monitor it.

## Cache Features

### Automatic Memory Management

- **Cache Size Limit**: 512 MB (configurable)
- **LRU Eviction**: Automatically removes least recently used audio files when cache is full
- **Smart Cleanup**: When limit is reached, cache evicts to 75% capacity to prevent frequent evictions
- **Zero Configuration**: Works automatically without user intervention

### How It Works

1. **First Load**: When you load a song, the audio is decoded and stored in cache
2. **Subsequent Loads**: Loading the same song is instant (served from cache)
3. **Cache Full**: When cache exceeds 512 MB, oldest unused files are automatically removed
4. **Memory Safe**: Prevents the unlimited memory growth that caused 12+GB usage

## Cache Statistics

The cache exposes statistics that can be accessed via Tauri commands:

```javascript
// Get cache statistics
const stats = await invoke('get_cache_stats_command');
console.log(stats);
// Output:
// {
//   count: 5,                    // Number of cached files
//   memory_bytes: 384000000,     // Current cache size in bytes
//   memory_mb: 366.21,          // Current cache size in MB
//   max_cache_bytes: 536870912,  // Max cache size in bytes
//   max_cache_mb: 512.0         // Max cache size in MB
// }
```

## Manual Cache Management

While the cache manages itself automatically, you can also control it manually:

### Clear Entire Cache

```javascript
await invoke('clear_audio_cache_command');
```

Useful when:
- You want to free up memory immediately
- You've imported new versions of songs
- You're troubleshooting audio issues

### Remove Specific File

```javascript
await invoke('remove_from_cache_command', { path: '/path/to/song.ogg' });
```

Useful when:
- You've updated a specific song file
- You want to reload a specific track

## Performance Impact

### Before Cache Management
- **Memory Usage**: 12+ GB for 2 songs (unbounded growth)
- **Risk**: Out of memory crashes
- **User Impact**: Application slowdown, system instability

### After Cache Management
- **Memory Usage**: Maximum 512 MB for audio cache
- **Performance**: Fast loading with memory safety
- **User Impact**: Stable, predictable memory usage

## Cache Behavior Examples

### Example 1: Normal Usage (Under Limit)

```
Load Song 1 (150 MB) → Cache: 150 MB / 512 MB
Load Song 2 (180 MB) → Cache: 330 MB / 512 MB
Load Song 3 (200 MB) → Cache: 530 MB / 512 MB
   → Eviction triggered!
   → Song 1 removed (oldest)
   → Cache: 380 MB / 512 MB (75% of limit)
```

### Example 2: Accessing Songs Prevents Eviction

```
Load Song 1 (150 MB) → Cache: 150 MB / 512 MB
Load Song 2 (180 MB) → Cache: 330 MB / 512 MB
Play Song 1           → Song 1 marked as recently used
Load Song 3 (200 MB) → Cache: 530 MB / 512 MB
   → Eviction triggered!
   → Song 2 removed (oldest, Song 1 was recently used)
   → Cache: 350 MB / 512 MB
```

## Configuration

The cache size limit is set in the Rust code and can be adjusted if needed:

**File**: `harmonysync/src-tauri/src/application/audio_decoder.rs`

```rust
/// Maximum cache size in bytes (default: 512 MB)
const MAX_CACHE_SIZE_BYTES: usize = 512 * 1024 * 1024;
```

To change the limit:
1. Modify `MAX_CACHE_SIZE_BYTES` in the code
2. Rebuild the application: `cargo build --release`

**Recommended Values**:
- **256 MB**: For systems with limited RAM
- **512 MB**: Default, good balance (recommended)
- **1024 MB**: For systems with plenty of RAM and large song libraries

## Troubleshooting

### High Memory Usage

If you still experience high memory usage:

1. **Check cache stats** to see if cache is working:
   ```javascript
   const stats = await invoke('get_cache_stats_command');
   console.log(`Cache: ${stats.memory_mb.toFixed(2)} MB / ${stats.max_cache_mb} MB`);
   ```

2. **Clear the cache** to reset:
   ```javascript
   await invoke('clear_audio_cache_command');
   ```

3. **Check for leaks** in browser DevTools:
   - Open DevTools → Memory tab
   - Take heap snapshot
   - Look for retained AudioBuffer objects

### Cache Not Working

If audio files aren't being cached:

1. Check console logs for cache hit/miss messages
2. Verify files are being loaded through the cache API
3. Check file paths are consistent (caching uses path as key)

## Technical Details

### Cache Implementation

- **Thread-Safe**: Uses DashMap for concurrent access
- **Efficient**: Arc-wrapped audio data prevents unnecessary copying
- **Smart Eviction**: LRU strategy ensures frequently used files stay cached
- **Low Overhead**: Timestamp tracking uses atomic operations

### Memory Calculation

Cache memory includes:
- Audio sample data (f32 array)
- Metadata (channels, sample rate, duration)
- Path strings
- Overhead (Arc, timestamps, etc.)

### Cache Entry Lifecycle

```
1. Decode: File decoded → DecodedAudio created
2. Store: Wrapped in Arc, added to cache with timestamp
3. Access: Touch updates timestamp
4. Evict: Oldest entries removed when limit exceeded
5. Drop: Arc ensures cleanup when no longer referenced
```

## Best Practices

1. **Let it manage itself**: The cache is designed to work automatically
2. **Monitor for issues**: Use cache stats to verify proper operation
3. **Clear on import**: Clear cache when importing new song versions
4. **Don't over-configure**: The 512 MB default works well for most use cases

## Future Improvements

Potential enhancements to consider:

- **Per-song preloading hints**: Allow UI to suggest which songs to keep cached
- **Persistent cache**: Save decoded audio to disk for faster startup
- **Adaptive limits**: Adjust cache size based on available system RAM
- **Cache warming**: Pre-load songs in the background during idle time
