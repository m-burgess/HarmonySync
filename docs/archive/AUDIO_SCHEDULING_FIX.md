# Audio Scheduling Fix - Preventing Track Drift

## Problem

The multitrack audio playback system was experiencing immediate drift where audio tracks would not stay synchronized. Even though they were supposed to start at the same time, they would start at slightly different moments, causing them to become increasingly out of sync.

## Root Cause

The drift was caused by insufficient scheduling buffer time in the audio service:

1. **Small buffer windows**: The original implementation used only 50-250ms scheduling buffers
2. **Preparation during scheduling**: Tracks were being prepared and scheduled simultaneously
3. **Variable initialization times**: Different tracks took different amounts of time to initialize their audio processes (ffplay/audic)
4. **Race conditions**: With such small buffers, some tracks wouldn't be fully ready when the scheduled start time arrived

## Solution

The fix implements proper **buffer scheduling** with adequate preparation time:

### 1. Duration Tracking (Frontend)

**Added duration field to Track interface:**
```typescript
export interface Track {
  id: string;
  name: string;
  filePath: string;
  duration?: number; // Duration in seconds - NEW
  // ... other fields
}
```

**Benefits:**
- Frontend now receives track duration information from backend
- Enables future enhancements for precise scheduling
- Provides better UI feedback about track lengths

### 2. Improved Scheduling Buffer (Backend)

**Changes to `audioMixer.ts`:**

#### Master Clock Playback
```typescript
// BEFORE: 250ms buffer
const startAtMs = Date.now() + 250;

// AFTER: 500ms buffer with preparation first
const preparedTracks = await Promise.all(
  tracks.map(async track => ({ 
    track, 
    audioFilePath: await this.prepareTrackForPlayback(track) 
  }))
);
const schedulingBufferMs = 500;
const startAtMs = Date.now() + schedulingBufferMs;
```

#### Synchronized Simultaneous Playback
```typescript
// BEFORE: 50ms buffer
const startAtMs = Date.now() + 50;

// AFTER: 300ms buffer with preparation first
const preparedTracks = await Promise.all(
  tracks.map(async track => ({ 
    track, 
    audioFilePath: await this.prepareTrackForPlayback(track) 
  }))
);
const schedulingBufferMs = 300;
const startAtMs = Date.now() + schedulingBufferMs;
```

### 3. Two-Phase Scheduling

The fix implements a two-phase approach:

**Phase 1: Preparation** (Parallel)
- All tracks are fully prepared before any scheduling begins
- FFmpeg conversions are completed
- Audio files are ready to play
- Time taken: Variable (logged for debugging)

**Phase 2: Scheduled Start** (Synchronized)
- All tracks receive the same future start time
- Adequate buffer (300-500ms) allows all processes to initialize
- Tracks start simultaneously at the scheduled moment

### 4. Enhanced Logging

Added comprehensive logging for debugging and verification:

```typescript
// Before playback
console.log('📊 Track durations:');
tracks.forEach(track => {
  console.log(`  - ${track.name}: ${track.duration.toFixed(2)}s`);
});

// After preparation
console.log(`✅ All tracks prepared in ${prepareTime}ms`);

// Scheduling info
console.log(`⏰ Scheduling playback to start at +${schedulingBufferMs}ms from now`);

// After start
console.log(`✅ ${succeededTracks.length}/${tracks.length} tracks started simultaneously`);

// Verification
setTimeout(() => {
  const playingCount = tracks.filter(t => t.isPlaying).length;
  console.log(`🎵 Verification: ${playingCount}/${tracks.length} tracks confirmed playing`);
}, 200);
```

## Technical Details

### Why This Works

1. **Preparation First**: By preparing all tracks before scheduling, we eliminate the variable time factor
2. **Adequate Buffer**: 300-500ms gives audio processes (ffplay/audic) time to:
   - Spawn child processes
   - Open audio files
   - Initialize audio output devices
   - Be ready to play at the exact scheduled moment
3. **Consistent Timing**: All tracks use the exact same `startAtMs` timestamp
4. **Verification**: Post-start checks confirm all tracks actually started

### Scheduling Timeline Example

```
Time 0ms:     Start preparing all tracks
Time 50ms:    Track 1 prepared
Time 75ms:    Track 2 prepared
Time 120ms:   Track 3 prepared
Time 150ms:   All tracks prepared
              Calculate: startAtMs = now + 500ms
Time 200ms:   Send start commands to all tracks with startAtMs
Time 650ms:   ALL tracks start playing simultaneously (scheduled time)
```

## Files Changed

### Frontend Changes
1. `apps/renderer/src/types/audio.ts` - Added `duration` field to Track interface
2. `apps/renderer/src/utils/api/audio-client.ts` - Added `duration` to MixerState tracks
3. `apps/renderer/src/utils/audio/nodejs-audio-client.ts` - Pass through duration from backend
4. `apps/renderer/src/utils/audio/audio-nodejs.ts` - Include duration in TrackLoadResult

### Backend Changes
1. `apps/harmonysync-audio-service/audioMixer.ts`:
   - Updated `startMasterClockPlayback()` - 500ms buffer, prepare-first approach
   - Updated `startSynchronizedSimultaneousPlayback()` - 300ms buffer, prepare-first approach
   - Added duration and timing logging throughout

## Testing

To verify the fix:

1. **Load multiple audio tracks** in the multitrack player
2. **Click "Play All"** to start playback
3. **Check console logs** for:
   - All tracks prepared message
   - Scheduling buffer time
   - Synchronized start confirmation
   - Verification of all tracks playing

4. **Listen for drift**: Tracks should remain perfectly synchronized throughout playback

## Future Enhancements

Now that duration is tracked on the frontend, potential improvements include:

1. **Web Audio API Scheduling**: Use `AudioBufferSourceNode.start(when)` for browser-based scheduling
2. **Visual Timeline**: Show track durations in the UI
3. **Seek Synchronization**: Implement synchronized seeking across all tracks
4. **Auto-Crossfade**: Use duration info to time transitions between songs

## References

- Web Audio API Scheduling: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
- Audio Context Timing: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/currentTime
- Process Spawning Best Practices: https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
