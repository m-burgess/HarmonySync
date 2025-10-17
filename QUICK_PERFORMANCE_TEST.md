# Quick Performance Test Guide

## What You Just Tested

✅ **OGG File**: 24.1 seconds, 74.4 MB cached
✅ **WAV File**: 18.8 seconds, 74.4 MB cached  
✅ **Cache Working**: Both files now in cache (149 MB total)

## Next: Check Rust Terminal Logs

Look for these lines in your **terminal** (not browser console):

```
INFO app_lib::application::audio_decoder: Decoding audio file: /path/to/file
INFO app_lib::application::audio_decoder: Audio info - Sample rate: 48000Hz, Channels: 2
INFO app_lib::application::audio_decoder: End of audio stream reached
INFO app_lib::application::audio_decoder: Decoded 19353600 samples (3.00s) from /path/to/file in 245.32ms
INFO app_lib::application::commands: [Tauri] Clone took 150.45ms
INFO app_lib::application::commands: [Tauri] Total command time: 18827.12ms
```

### Key Timing Breakdown:

1. **"Decoded ... in XXXms"** = Pure Rust decoding time (should be <1000ms)
2. **"Clone took XXXms"** = Memory copy time (should be <500ms)
3. **"Total command time"** = Everything including IPC/serialization

### What This Tells Us:

**If Rust decode time is <1000ms but total is 18000ms:**
→ Problem is **IPC serialization** (sending 74MB over Tauri's JSON bridge)

**If Rust decode time is ~18000ms:**
→ Problem is **debug build** (need to use release mode)

## Test with Release Build (Should be MUCH faster)

```bash
cd /home/burg316/RustPresenter/harmonysync
npm run tauri dev -- --release
```

Then decode the same files again and compare times.

## Expected Performance with Release Build:

| File | Current (Debug) | Expected (Release) | Improvement |
|------|----------------|-------------------|-------------|
| OGG 3min | 24.1s | 0.3-0.6s | **40-80x faster** |
| WAV 3min | 18.8s | 0.1-0.3s | **60-180x faster** |
| Cache hit | <5ms | <1ms | **5x faster** |

## Quick Test Now:

1. Clear the cache in the debug UI (click "Clear Cache" button)
2. Decode the WAV file again
3. **Copy the terminal output** and share it
4. This will show us the timing breakdown

## Alternative: Check Logs File

If you don't see logs in terminal, check the log file:

```bash
# Find the log file
ls -la ~/.local/share/harmonysync/logs/

# View the latest logs
tail -n 100 ~/.local/share/harmonysync/logs/*.log
```

Look for lines with:
- `Decoding audio file`
- `Decoded ... in XXXms`
- `[Tauri] Clone took`
- `[Tauri] Total command time`

---

**Action Required**: Please share the terminal output (especially the `INFO` lines) so we can see where the 18+ seconds is being spent!
