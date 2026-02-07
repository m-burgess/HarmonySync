# Frontend Web Audio API Scheduling

## Overview

This document explains the frontend scheduled playback implementation using the Web Audio API's `AudioBufferSourceNode.start(when)` method. This addresses the original issue requirements:

1. **Calculate the duration of each track** - Done by loading audio files into AudioBuffers
2. **Schedule playback using node.start()** - Done using `AudioContext.currentTime` and `source.start(when)`

## Architecture

### File: `scheduled-playback.ts`

The core module implementing Web Audio API scheduling with two main functions:

#### 1. Calculate Track Durations

```typescript
async function calculateTrackDurations(tracks: Track[]): Promise<Track[]>
```

**What it does:**
- Loads each track's audio file into an `AudioBuffer`
- Extracts precise duration from the decoded buffer
- Returns tracks with duration and buffer populated

**Why it matters:**
- AudioBuffers provide sample-accurate duration
- Buffers are needed for Web Audio API playback
- Enables verification that all tracks have same duration

**Example output:**
```
📊 Calculating durations for 3 tracks...
📥 Loading audio buffer: /path/to/track1.mp3
✅ Audio buffer loaded: 245.50s, 2 channels, 44100Hz
✅ Track durations calculated:
  - Track1: 245.50s
  - Track2: 245.50s
  - Track3: 245.50s
```

#### 2. Play All Tracks Scheduled

```typescript
async function playAllTracksScheduled(tracks: Track[]): Promise<void>
```

**What it does:**
- Stops any currently playing tracks
- Calculates a future start time using `AudioContext.currentTime`
- Creates an `AudioBufferSourceNode` for each track
- Schedules all tracks to start at the exact same time using `source.start(when)`

**Why it prevents drift:**
- All tracks receive the same `startTime` value
- Uses high-precision audio clock (`AudioContext.currentTime`)
- Scheduling happens before playback, eliminating race conditions
- 300ms buffer ensures all sources are ready

**Example output:**
```
🎵 Starting scheduled playback for 3 tracks
⏰ Scheduling playback to start at audio context time: 123.456s (current: 123.156s, +0.3s)
✅ Scheduled Track1 to start at 123.456s
✅ Scheduled Track2 to start at 123.456s
✅ Scheduled Track3 to start at 123.456s
✅ 3/3 tracks scheduled successfully
🎯 All tracks will start simultaneously at audio context time 123.456s
🎵 Verification: 3/3 tracks confirmed playing
```

## Integration

### Audio Service Layer

**File:** `AudioService.ts`

```typescript
public async playAllTracksFrontendScheduled(tracks): Promise<void> {
  await audioUtils.playAllTracksFrontendScheduled(tracks);
}
```

Exposes frontend scheduling to the application layer.

### ViewModel Layer

**File:** `AudioViewModel.ts`

```typescript
public async playAllFrontendScheduled(): Promise<void> {
  await this.audioService.playAllTracksFrontendScheduled(this.tracks);
  this.isPlaying = true;
}
```

Provides a MobX action for the UI to trigger frontend scheduling.

### UI Layer

**File:** `MultitrackPlayer.tsx`

Added a second play button:
- **Dark green button**: Backend service playback (existing)
- **Light green button with border**: Frontend Web Audio API scheduled playback (new)

```tsx
<button 
  title="Play All (Frontend Web Audio API - Scheduled)" 
  className="p-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white border-2 border-green-400" 
  onClick={() => viewModel.playAllFrontendScheduled()}
>
  <PlayIcon className="w-5 h-5" />
</button>
```

## Technical Details

### Web Audio API Scheduling

The key to preventing drift is the `AudioBufferSourceNode.start(when)` method:

```typescript
const audioContext = getAudioContext();
const schedulingBufferSeconds = 0.3; // 300ms buffer
const startTime = audioContext.currentTime + schedulingBufferSeconds;

// Create source for each track
const source = audioContext.createBufferSource();
source.buffer = track.buffer;

// Schedule to start at the exact same time
source.start(startTime); // <-- The key to synchronization
```

**Why this works:**

1. **High-Precision Clock**: `AudioContext.currentTime` is a high-precision audio clock, far more accurate than `Date.now()`

2. **Sample-Accurate Scheduling**: The Web Audio API scheduler works at the sample level (e.g., 44100 samples per second), ensuring microsecond precision

3. **Same Start Time**: All tracks receive the exact same `startTime` value, eliminating any possibility of drift

4. **Scheduling Buffer**: The 300ms buffer gives time for:
   - All AudioBufferSourceNodes to be created
   - Audio graph connections to be established
   - Operating system to prepare audio output
   - Prevents buffer underruns

### Audio Graph

For each track, the following audio graph is created:

```
AudioBufferSource → GainNode → StereoPannerNode → AudioContext.destination
                     (volume)     (pan L/R)         (speakers)
```

**Components:**
- **AudioBufferSourceNode**: Plays the decoded audio buffer
- **GainNode**: Controls volume (0.0 to 1.0+)
- **StereoPannerNode**: Controls stereo position (-1.0 = left, 0 = center, 1.0 = right)
- **AudioContext.destination**: Routes to audio output device

### Limitations

1. **One-Time Playback**: `AudioBufferSourceNode` can only be used once
   - After `stop()` is called, a new source must be created to play again
   - This is why `goToBeginning()` requires creating new sources

2. **Memory Usage**: All audio data is loaded into memory as AudioBuffers
   - For a 3-minute stereo track at 44.1kHz: ~30MB RAM per track
   - Compare to streaming which uses minimal memory
   - Consider memory constraints with many or long tracks

3. **No Position Seeking**: `AudioBufferSourceNode` doesn't provide current playback position
   - Position is estimated: `audioContext.currentTime - startTime`
   - Not sample-accurate, but sufficient for UI display

4. **Browser-Only**: This approach only works in the browser
   - Cannot be used in Node.js backend
   - Backend scheduling uses ffplay/audic instead

## Comparison: Frontend vs Backend Scheduling

| Aspect | Frontend (Web Audio API) | Backend (Node.js Service) |
|--------|-------------------------|---------------------------|
| **Precision** | Sample-accurate (AudioContext.currentTime) | Millisecond-accurate (Date.now()) |
| **Clock** | Audio clock (~microseconds) | System clock (~1ms) |
| **Memory** | ~30MB per 3-min track | Streaming (minimal) |
| **Seeking** | Limited (estimate only) | Full support |
| **Dependencies** | Browser only | Node.js + ffplay/audic |
| **Scheduling** | `source.start(when)` | `setTimeout() + spawn()` |
| **Portability** | Browser environment only | Any Node.js environment |
| **Reliability** | Very high (Web Audio spec) | High (depends on OS timing) |

## When to Use Each

### Use Frontend Scheduling When:
- ✅ Maximum precision is required
- ✅ Tracks are relatively short (<5 minutes)
- ✅ Memory usage is not a concern
- ✅ Browser-only deployment
- ✅ No seeking functionality needed

### Use Backend Scheduling When:
- ✅ Memory efficiency is important (streaming)
- ✅ Very long tracks (>10 minutes)
- ✅ Seeking/scrubbing is required
- ✅ Backend processing capabilities needed
- ✅ Node.js environment

## Best Practices

1. **Always Calculate Durations First**
   ```typescript
   const tracksWithDurations = await calculateTrackDurations(tracks);
   await playAllTracksScheduled(tracksWithDurations);
   ```

2. **Use Adequate Scheduling Buffer**
   ```typescript
   // Minimum 100ms, recommended 300ms
   const startTime = audioContext.currentTime + 0.3;
   ```

3. **Verify Synchronization**
   ```typescript
   setTimeout(() => {
     const playing = tracks.filter(t => t.isPlaying).length;
     console.log(`Verification: ${playing}/${tracks.length} playing`);
   }, (schedulingBufferSeconds + 0.1) * 1000);
   ```

4. **Handle Cleanup Properly**
   ```typescript
   // Always stop sources when done
   source.stop();
   
   // Clear references
   scheduledTracks.clear();
   ```

5. **Monitor Memory**
   ```typescript
   // For 4 tracks × 3 min × stereo × 44.1kHz ≈ 120MB
   // Consider user's device capabilities
   if (tracks.length > 10) {
     console.warn('High memory usage expected');
   }
   ```

## Debugging

### Console Logging

The implementation includes detailed logging:

```
🔢 Calculating durations for 3 tracks...
📥 Loading audio buffer: /path/to/track.mp3
✅ Audio buffer loaded: 245.50s, 2 channels, 44100Hz
📊 Step 1: Calculating track durations...
✅ Track durations calculated:
  - Track1: 245.50s
  - Track2: 245.50s
⏰ Step 2: Scheduling playback with node.start()...
🎵 Starting scheduled playback for 3 tracks
⏰ Scheduling playback to start at audio context time: 123.456s
✅ Scheduled Track1 to start at 123.456s
✅ 3/3 tracks scheduled successfully
🎯 All tracks will start simultaneously at audio context time 123.456s
🎵 Verification: 3/3 tracks confirmed playing
```

### Common Issues

**Issue: "No audio buffer" error**
```
Cannot create source for Track1: no audio buffer
```
**Solution:** Ensure `calculateTrackDurations()` is called first

**Issue: Tracks don't start**
```
❌ Failed to schedule Track1: InvalidStateError
```
**Solution:** AudioBufferSourceNode was already started/stopped, create a new one

**Issue: Clicks/pops at start**
```
Audio glitches when playback starts
```
**Solution:** Increase scheduling buffer from 300ms to 500ms

**Issue: Out of memory**
```
RangeError: Failed to allocate AudioBuffer
```
**Solution:** Reduce number of tracks or use backend streaming instead

## Testing

### Unit Test Example

```typescript
test('calculateTrackDurations loads buffers and extracts durations', async () => {
  const tracks = [
    { filePath: '/test/track1.mp3', name: 'Track1', id: '1' },
    { filePath: '/test/track2.mp3', name: 'Track2', id: '2' },
  ];
  
  const result = await calculateTrackDurations(tracks);
  
  expect(result[0].duration).toBeDefined();
  expect(result[0].buffer).toBeDefined();
  expect(result[1].duration).toBeDefined();
  expect(result[1].buffer).toBeDefined();
});
```

### Integration Test Example

```typescript
test('playAllTracksScheduled starts all tracks simultaneously', async () => {
  const tracks = await calculateTrackDurations(testTracks);
  await playAllTracksScheduled(tracks);
  
  // Wait for scheduling buffer + 100ms
  await delay(400);
  
  expect(isPlayingScheduled()).toBe(true);
  expect(tracks.every(t => t.isPlaying)).toBe(true);
});
```

## Future Enhancements

### 1. Seeking Support
```typescript
// Potential implementation
function seekTo(position: number) {
  const currentTracks = Array.from(scheduledTracks.values());
  stopAllScheduledTracks();
  
  // Create new sources starting at offset
  currentTracks.forEach(({ track }) => {
    const source = createScheduledSource(track, audioContext, 0);
    source.start(0, position); // Start with offset
  });
}
```

### 2. Looping Support
```typescript
source.loop = true;
source.loopStart = 0;
source.loopEnd = buffer.duration;
```

### 3. Real-Time Position
```typescript
// More accurate position tracking
const analyser = audioContext.createAnalyser();
source.connect(analyser);
// Use analyser for precise position
```

### 4. Crossfade Support
```typescript
// Fade out old tracks, fade in new tracks
oldTracks.forEach(track => {
  track.gainNode.gain.linearRampToValueAtTime(0, fadeEndTime);
});
newTracks.forEach(track => {
  track.gainNode.gain.linearRampToValueAtTime(1, fadeEndTime);
});
```

## Resources

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [MDN: AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
- [MDN: AudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)
- [Audio Scheduling Best Practices](https://www.html5rocks.com/en/tutorials/audio/scheduling/)
