# File-Backed Audio Buffer Implementation

## Overview

This implementation provides a hybrid file-backed buffer system for audio playback in HarmonySync, similar to platforms like multitracks.com and Loop Community. The system preloads and prepares audio files in the backend, preventing crashes and memory issues that can occur when loading large audio files directly in the frontend.

## Architecture

### Backend (harmonysync-audio-service)

#### 1. **AudioTrack Class Enhancement** (`audioTrack.ts`)

Added preload state tracking to each audio track:

```typescript
// New properties
public isPreloaded: boolean;
public preloadStatus: 'pending' | 'loading' | 'ready' | 'error';
public preloadError?: string;
public preparedFilePath: string | null;
```

**`preload()` Method:**
- Checks if file is already preloaded (returns early if ready)
- Loads metadata (duration, channels, sample rate) if not already loaded
- For WAV files: Uses them directly (already in optimal format)
- For non-WAV files: Converts to WAV using FFmpeg for faster playback
- Stores prepared file path for instant playback
- Updates status to 'ready', 'error', or 'loading'

**`cleanupPreloadedResources()` Method:**
- Removes temporary converted files
- Resets preload state to 'pending'

#### 2. **AudioMixer Enhancement** (`audioMixer.ts`)

**`preloadTrack(trackId)` Method:**
- Preloads a specific track by ID
- Emits mixer state update via Socket.IO

**`preloadAllTracks()` Method:**
- Preloads all loaded tracks in parallel using `Promise.all()`
- Emits mixer state update when complete

**Cleanup Integration:**
- `removeTrack()` now calls `cleanupPreloadedResources()`
- `clearAllTracks()` cleans up all preloaded resources

#### 3. **REST API Endpoints** (`server.ts`)

New endpoints added:

- **`POST /api/tracks/preload-all`**: Preloads all currently loaded tracks
- **`POST /api/tracks/:id/preload`**: Preloads a specific track by ID

#### 4. **Socket.IO Events**

New event handlers:
- **`preload_track`**: Client requests preload for specific track
- **`preload_all_tracks`**: Client requests preload for all tracks

Existing events enhanced:
- **`mixer_state_changed`**: Now includes `isPreloaded`, `preloadStatus`, `preloadError` for each track

### Frontend (renderer)

#### 1. **Type Definitions**

**`AudioTrack` interface** (`types/models.ts`, `types/audio.ts`):
```typescript
interface AudioTrack {
  // ... existing fields
  isPreloaded?: boolean;
  preloadStatus?: 'pending' | 'loading' | 'ready' | 'error';
  preloadError?: string;
}
```

#### 2. **AudioService** (`services/AudioService.ts`)

New methods:
- **`preloadAllTracks()`**: Invokes IPC to preload all tracks
- **`preloadTrack(trackId)`**: Invokes IPC to preload specific track

#### 3. **AudioViewModel** (`viewmodels/AudioViewModel.ts`)

**Enhanced `loadSong()` method:**
```typescript
async loadSong(folderPath: string) {
  // 1. Load tracks from backend
  // 2. Map tracks with preload status fields
  // 3. Load saved mixer config
  // 4. Auto-trigger preload of all tracks
  await this.audioService.preloadAllTracks();
}
```

The preload happens automatically after tracks are loaded, ensuring files are ready before playback.

#### 4. **IPC Handlers** (`electron-app/ipc-handlers.ts`)

New IPC handlers:
- **`audio:preloadAllTracks`**: Calls `/api/tracks/preload-all`
- **`audio:preloadTrack`**: Calls `/api/tracks/:id/preload`

#### 5. **UI Components**

**TrackControlCard** (`components/audio/TrackControlCard.tsx`):
- Displays visual preload status indicator
- **✓** (green) = Ready for playback
- **⟳** (yellow) = Loading/preparing
- **✗** (red) = Preload failed
- **○** (gray) = Pending

## Workflow

### 1. Loading a Song

```
User selects folder
    ↓
AudioViewModel.loadSong()
    ↓
Backend: Load tracks, extract metadata
    ↓
Frontend: Receive track list via IPC
    ↓
Frontend: Auto-trigger preloadAllTracks()
    ↓
Backend: Preload each track in parallel
    ├─ WAV files: Use directly
    └─ Other formats: Convert to WAV with FFmpeg
    ↓
Backend: Emit mixer_state_changed with preload status
    ↓
Frontend: Update UI with checkmarks
```

### 2. Playing Audio

```
User clicks Play
    ↓
Check if tracks are preloaded (isPreloaded = true)
    ├─ Ready: Use prepared file paths for instant playback
    └─ Not ready: Fallback to standard loading (graceful degradation)
```

### 3. Real-time Updates

The frontend automatically receives preload status updates via Socket.IO:
```
Backend track.preload() updates status
    ↓
Backend emits mixer_state_changed
    ↓
Frontend nodejs-audio-client receives event
    ↓
UI updates track indicators automatically (MobX reactivity)
```

## Benefits

1. **Prevents Crashes**: Backend handles file loading, avoiding frontend memory issues
2. **Instant Playback**: Pre-converted WAV files ready for immediate playback
3. **Visual Feedback**: Users see when tracks are ready to play
4. **Graceful Degradation**: System works even if preload fails
5. **Memory Efficient**: Temporary files cleaned up after use
6. **Real-time Status**: Socket.IO provides live updates during preparation

## Technical Details

### FFmpeg Conversion

Non-WAV files are converted using:
```bash
ffmpeg -i input.mp3 -acodec pcm_s16le -ar 44100 -ac 2 -y output.wav
```

Parameters:
- `-acodec pcm_s16le`: PCM 16-bit little-endian (standard WAV)
- `-ar 44100`: 44.1 kHz sample rate
- `-ac 2`: Stereo (2 channels)
- `-y`: Overwrite output file

### File Locations

Converted files stored in OS temp directory:
- Format: `harmonysync_preload_{trackId}_{timestamp}.wav`
- Cleaned up on track removal or app shutdown

### Error Handling

- Preload failures are non-fatal
- Tracks can still be played using original files
- Error messages stored in `preloadError` field
- UI shows red X indicator for failed preloads

## Testing

Run the preload test:
```bash
cd apps/harmonysync-audio-service
pnpm build
node dist/test-preload.js
```

Tests verify:
- ✅ Initial state is correct
- ✅ State includes preload fields
- ✅ Graceful failure for missing files
- ✅ Successful preload for WAV files
- ✅ Cleanup works correctly

## Future Enhancements

Possible improvements:
1. **Configurable preload strategy**: Allow users to disable auto-preload
2. **Disk space checks**: Verify sufficient space before conversion
3. **Progress tracking**: Show conversion progress for large files
4. **Partial preload**: Preload only clicked/guide tracks first
5. **Cache management**: Keep converted files between sessions
6. **Format optimization**: Support other optimal formats (FLAC, ALAC)

## Dependencies

- **FFmpeg**: Required for audio format conversion
- **music-metadata**: Extracts audio file metadata
- **node-wav**: WAV file decoding (for panning operations)
- **Socket.IO**: Real-time state updates

## Configuration

No configuration required - preload happens automatically.

To disable auto-preload, comment out in `AudioViewModel.loadSong()`:
```typescript
// await this.audioService.preloadAllTracks();
```
