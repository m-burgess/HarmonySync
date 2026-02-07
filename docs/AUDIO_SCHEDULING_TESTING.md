# Testing Guide for Audio Scheduling Fix

## Overview

This guide provides instructions for manually testing the audio scheduling improvements that fix the track drift issue.

## Prerequisites

1. **Audio Service Running**: The Node.js audio service must be running
   ```bash
   cd apps/harmonysync-audio-service
   ./start-service.sh start
   ```

2. **Test Audio Files**: Have multiple audio tracks (at least 3-4) in the same folder
   - Ideally, tracks should be multitrack stems from the same song
   - WAV, MP3, or other supported formats

## Test Scenarios

### Test 1: Basic Synchronization Test

**Purpose**: Verify that multiple tracks start simultaneously without drift

**Steps**:
1. Open HarmonySync application
2. Load a song with multiple tracks (at least 3-4 tracks)
3. Open the browser console (F12) to view logs
4. Click "Play All" button
5. Observe the console output

**Expected Results**:
```
📊 Track durations:
  - Track 1: 245.50s
  - Track 2: 245.50s
  - Track 3: 245.50s
🔄 Preparing all tracks for synchronized playback...
✅ All tracks prepared in XXXms
⏰ Scheduling synchronized playback to start at +300ms from now
✅ 3/3 tracks started simultaneously in XXXms
🎵 Verification: 3/3 tracks confirmed playing
```

**Success Criteria**:
- All tracks show the same or very similar durations
- All tracks are prepared before scheduling begins
- Message shows "X/X tracks started simultaneously"
- Verification shows "X/X tracks confirmed playing"
- **Audio remains synchronized throughout playback** (most important!)

### Test 2: Restart Test

**Purpose**: Verify scheduling works correctly when restarting playback

**Steps**:
1. With tracks loaded and playing, click "Stop All"
2. Wait 2 seconds
3. Click "Start From Beginning" (restart button)
4. Observe console logs

**Expected Results**:
- Same synchronized start sequence as Test 1
- All tracks restart at the same time
- No drift when tracks restart

### Test 3: Multiple Song Test

**Purpose**: Verify scheduling works across different songs

**Steps**:
1. Load Song A, click "Play All", let it play for 10 seconds
2. Click "Stop All"
3. Load Song B (different audio files)
4. Click "Play All"
5. Observe console logs

**Expected Results**:
- Song B tracks are prepared and scheduled correctly
- No interference from previous song
- Synchronized playback

### Test 4: Timing Metrics Test

**Purpose**: Verify preparation and scheduling times are reasonable

**Steps**:
1. Load a song with 5+ tracks
2. Click "Play All"
3. Note the timing metrics in console

**Expected Results**:
```
✅ All tracks prepared in XXXms
⏰ Scheduling synchronized playback to start at +300ms from now
```

**What to Look For**:
- Preparation time should be reasonable (< 5 seconds for most systems)
- If preparation takes too long, it may indicate:
  - FFmpeg conversion issues
  - Large file sizes
  - System resource constraints

### Test 5: Error Handling Test

**Purpose**: Verify graceful handling of track failures

**Steps**:
1. Load a mix of valid and corrupted audio files
2. Click "Play All"
3. Observe console logs

**Expected Results**:
```
⚠️ X track(s) failed to start:
   - CorruptTrack.mp3: [error message]
✅ Y/Z tracks started simultaneously
```

**Success Criteria**:
- Working tracks still play in sync
- Failed tracks are clearly reported
- Application doesn't crash

## Audio Quality Checks

### Synchronization Verification

**How to Listen for Drift**:

1. **Mono/Stereo Test**:
   - If you have tracks panned left/right (e.g., click track left, music right)
   - Listen with headphones
   - If drift occurs, you'll hear the stereo image shift or phase issues

2. **Click Track Test**:
   - If available, use a click/metronome track
   - The click should remain perfectly in time with the music
   - Any drift will be immediately obvious with the click

3. **Long Duration Test**:
   - Play a full song (3-5 minutes)
   - Listen at the beginning, middle, and end
   - Drift compounds over time - a small drift at start becomes obvious later

4. **Transient Test**:
   - Focus on drum hits or sharp attacks
   - These should sound tight and clean
   - Drift causes transients to sound "phasy" or doubled

## Troubleshooting

### Issue: Tracks Don't Start

**Symptoms**:
```
❌ Error in synchronized playback: ...
```

**Possible Causes**:
1. Audio service not running
2. FFmpeg not installed
3. Invalid audio file formats

**Solutions**:
1. Check audio service status: `./start-service.sh status`
2. Verify FFmpeg: `which ffmpeg`
3. Try different audio files

### Issue: Drift Still Occurs

**Symptoms**:
- Tracks start but gradually go out of sync
- Phase issues in audio
- Stereo image shifts

**Debugging Steps**:
1. Check preparation time in logs - if too long, increase `schedulingBufferMs`
2. Check system resources - high CPU/memory can cause timing issues
3. Try fewer tracks to isolate the issue
4. Check if specific track formats cause problems

**Report to Developer**:
Include in your bug report:
- Full console log output
- Number of tracks
- Track file formats and sizes
- Preparation time shown in logs
- System specs (OS, RAM, CPU)

### Issue: Some Tracks Don't Start

**Symptoms**:
```
✅ 2/4 tracks started simultaneously
🎵 Verification: 2/4 tracks confirmed playing
```

**Possible Causes**:
1. FFmpeg conversion failed
2. Audio format not supported
3. Corrupted audio files
4. Insufficient system resources

**Solutions**:
1. Check failed tracks in logs
2. Try converting files to WAV manually
3. Reduce number of simultaneous tracks

## Performance Benchmarks

### Typical Performance Expectations

**Track Preparation**:
- 1-3 tracks: < 1 second
- 4-6 tracks: 1-3 seconds
- 7-10 tracks: 2-5 seconds

**Scheduling Buffer**:
- 300ms for synchronized playback
- 500ms for master clock playback

**Start Synchronization**:
- Tracks should start within 1-10ms of each other
- Human ear can detect drift > 30ms

### System Requirements

**Minimum**:
- CPU: Dual-core 2.0 GHz
- RAM: 4GB
- FFmpeg installed

**Recommended**:
- CPU: Quad-core 2.5 GHz or better
- RAM: 8GB or more
- SSD for audio file storage

## Reporting Results

When reporting test results, include:

1. **Test Scenario**: Which test you performed
2. **Expected vs Actual**: What you expected vs what happened
3. **Console Logs**: Full console output from the test
4. **Audio Quality**: Description of synchronization quality
5. **System Info**:
   - OS and version
   - Hardware specs
   - Number and format of audio files
6. **Timing Metrics**: Preparation time and scheduling buffer from logs

## Additional Notes

### Duration Information

The system now tracks track duration. In console logs, you may see:
```
📊 Track durations:
  - Track 1: 245.50s
  - Track 2: unknown
```

- `unknown` indicates duration not yet loaded (normal during initial load)
- Duration should appear after tracks are loaded
- All tracks of the same song should have identical or very close durations

### Future Testing

As the system evolves, additional tests may be needed for:
- Web Audio API scheduling (browser-based)
- Visual timeline synchronization
- Seek synchronization
- Crossfade synchronization
