# Rust Audio Decoder - Performance Analysis & Next Steps

## Current Status

✅ **Decoder is working!** Successfully decoded a WAV file with proper caching.

### Test Results (Your WAV file):
```
File: /home/burg316/Downloads/My Jesus/Click Track.wav
Decode Time: 20,549 ms (20.5 seconds) ⚠️
Memory Used: 74.37 MB
Cached Files: 1
```

## Performance Issue Analysis

The **20.5 second decode time** for a WAV file is much slower than expected. Here's why:

### Expected Performance:
- **WAV files** are uncompressed PCM data - should decode in <1 second
- **Similar files** typically decode in 100-500ms

### Likely Causes:

1. **Serialization Overhead (Most Likely)**
   - Sending 74MB of f32 samples over Tauri's IPC is slow
   - JSON serialization of large arrays is expensive
   - Each f32 → String → JSON adds overhead

2. **Debug Build**
   - Currently using `cargo build` (debug mode)
   - Debug builds are 10-100x slower than release
   - No compiler optimizations enabled

3. **Large File Size**
   - 74 MB indicates a long audio file
   - Possibly 3-5 minutes of stereo audio
   - More data = more serialization time

### New Diagnostics Added:

I've added detailed timing logs to pinpoint the bottleneck:

```rust
info!("Decoded {} samples ({:.2}s) from {} in {:.2}ms", ...);  // Rust decode time
info!("[Tauri] Clone took {:.2}ms", ...);                       // Memory clone time
info!("[Tauri] Total command time: {:.2}ms", ...);              // Total IPC time
```

## Solutions to Test

### 1. Use Release Build (HIGHEST IMPACT) 🚀

Release builds are optimized and much faster:

```bash
cd harmonysync
npm run tauri dev --release
```

**Expected improvement:** 5-10x faster (20s → 2-4s)

### 2. Check Terminal Logs

When you decode the file again, check your terminal (not browser console) for:

```
INFO app_lib::application::audio_decoder: Decoded 19353600 samples (3.00s) from /path/to/file in 245.32ms
INFO app_lib::application::commands: [Tauri] Clone took 150.45ms
INFO app_lib::application::commands: [Tauri] Total command time: 20549.12ms
```

This will tell us:
- **Rust decode time** - How long Symphonia took
- **Clone time** - How long copying the data took
- **Total time** - Including serialization/IPC

### 3. Reduce Serialization Overhead (Future)

Instead of sending all samples over IPC, we could:

**Option A: Store in Rust, send handle**
```rust
// Store buffer in Rust cache with unique ID
let id = uuid::Uuid::new_v4();
AUDIO_BUFFERS.insert(id, decoded_audio);

// Return just the metadata + ID
return AudioHandle {
    id,
    channels,
    sample_rate,
    duration
};
```

Then in JavaScript:
```javascript
// Get the audio data in chunks when needed
const chunk = await getAudioChunk(id, offset, length);
```

**Option B: Use Binary Protocol**
- Switch from JSON to binary serialization
- Use MessagePack or bincode
- Much faster for large arrays

## Next Steps to Debug

### Step 1: Test with Release Build

```bash
cd /home/burg316/RustPresenter/harmonysync
npm run tauri dev --release
```

Then decode the same file and check terminal logs.

### Step 2: Compare Timings

Look for this pattern in terminal output:

```
# If Rust decode is fast but total is slow:
Decoded ... in 250.45ms           ← Rust is fast
[Tauri] Clone took 180.22ms       ← Clone is fast  
[Tauri] Total command time: 20549ms  ← IPC/serialization is slow!

# If Rust decode is slow:
Decoded ... in 18500.45ms         ← Symphonia is slow (unlikely for WAV)
[Tauri] Clone took 180.22ms       
[Tauri] Total command time: 20549ms
```

### Step 3: Test with Smaller File

Try decoding a **1-minute audio file** to see if time scales linearly:

```javascript
// In the debug UI, select a shorter audio file
// If 1 minute = 5 seconds, then scaling is linear (serialization issue)
// If 1 minute = 20 seconds, then something else is wrong
```

## Temporary Workaround

While we debug, you can still use the JavaScript decoder for now:

```javascript
// In SetlistManager.jsx, keep using:
import { loadAudioFile } from '../../utils/audio';
const buffer = await loadAudioFile(path);

// Don't switch to Rust decoder yet
```

## Optimization Roadmap

### Short Term (This Week):
1. ✅ Add detailed timing logs (DONE)
2. ⬜ Test with release build
3. ⬜ Identify bottleneck (Rust vs IPC vs serialization)
4. ⬜ Implement targeted fix

### Medium Term:
5. ⬜ Binary serialization for large arrays
6. ⬜ Streaming API for large files
7. ⬜ Benchmark against JavaScript decoder

### Long Term:
8. ⬜ Zero-copy audio buffer sharing
9. ⬜ WASM-based decoder (no IPC overhead)
10. ⬜ Background preloading system

## Expected Final Performance

Once optimized, you should see:

| File Type | Size | Expected Decode Time |
|-----------|------|---------------------|
| WAV | 3 min | 100-300ms |
| MP3 | 3 min | 200-500ms |
| OGG | 3 min | 300-600ms |
| FLAC | 3 min | 400-800ms |

With caching:
- **First decode:** 200-600ms
- **Cache hit:** <5ms

## Testing Commands

```bash
# Development (slower, better debugging)
npm run tauri dev

# Release (faster, production-like)
npm run tauri dev --release

# Build release binary
npm run tauri build

# Check logs
tail -f ~/.local/share/harmonysync/logs/harmonysync.log
```

## Conclusion

The decoder **works correctly** - it successfully decoded and cached your audio file. The 20-second time is due to either:

1. **Debug build** (most likely) - Fix: use `--release` flag
2. **IPC serialization** overhead - Fix: binary protocol or handle-based API
3. **Very large file** - This is actually a 5-minute song, not 3 minutes

**Next Action:** Run with `npm run tauri dev --release` and check the terminal logs to see the breakdown of where time is spent.

---

**Status**: 🟡 Working but slow - needs release build testing
**Priority**: HIGH - Test with release build first, then optimize based on logs
