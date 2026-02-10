# Auto-Preload Service Order Items

## Overview

This feature automatically detects and preloads audio files when folders are added to the service order, ensuring instant playback readiness without manual intervention.

## How It Works

### 1. Folder Detection

When a user adds folders to the service order:

1. **Audio File Detection**: The system scans each folder for audio files
   - Supported formats: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`, `.wma`
   - Identifies all audio files and their paths

2. **Type Classification**: Folders are automatically classified as:
   - **'song'**: Contains one or more audio files
   - **'folder'**: Regular folder without audio files

3. **Metadata Extraction**: For song folders, the system extracts:
   - Track list with file names and paths
   - Audio file count
   - Folder name and ID

### 2. Auto-Preload Trigger

When a folder is classified as a 'song' type:

1. **Automatic Preload**: The system immediately triggers preload in the background
   - Non-blocking operation (doesn't delay adding other folders)
   - Uses the file-backed buffer system for optimal performance

2. **Audio Service Integration**:
   ```typescript
   await audioService.loadTracks(folderPath)  // Load tracks into audio service
   await audioService.preloadAllTracks()      // Convert to WAV and prepare
   ```

3. **Status Tracking**: The preloaded state is tracked in `preloadedSongs` Set
   - Allows UI to show "Ready" indicators
   - Enables instant playback without preparation delay

### 3. Preload Process

The preload operation performs the following:

1. **Load Tracks**: Loads all audio files from the folder into the audio service
2. **Format Conversion**: Converts non-WAV files to WAV using FFmpeg (if needed)
3. **File Preparation**: Stores prepared files in temp directory
4. **Ready State**: Updates UI to show the song is ready for instant playback

## User Experience

### Adding Folders

1. User clicks "Add to Service Order"
2. Selects folder(s) containing audio files
3. System adds folder(s) to service order immediately
4. Auto-preload starts in background (shown via loading message)
5. Once complete, preload button shows "✓ Ready"

### Visual Feedback

- **Loading Message**: Shows "Preloading [Song Name]..." during preparation
- **Progress Bar**: Displays preload progress (0% → 50% loading → 100% ready)
- **Ready Indicator**: Preload button changes to "✓ Ready" when complete
- **Non-blocking**: User can continue working while preload happens

## Benefits

1. **Zero Manual Steps**: No need to manually preload each song
2. **Instant Playback**: Songs are ready to play immediately when needed
3. **Better Performance**: Background preloading prevents delays during service
4. **Smart Detection**: Only preloads folders with actual audio content
5. **Error Resilient**: Failed preloads don't block other operations

## Configuration

Currently auto-preload happens automatically for all song folders. Future enhancements could include:

- Configuration option to enable/disable auto-preload
- Selective preload based on criteria (file count, size, etc.)
- Preload scheduling (immediate vs. idle time)

## Implementation Details

### IPC Handler Changes

**File**: `apps/electron-app/ipc-handlers.ts`

```typescript
// Enhanced service-order:loadSongMetadata handler
{
  type: 'song' | 'folder',          // Auto-detected based on audio files
  hasAudio: boolean,                 // True if audio files found
  tracks: Array<{                    // List of audio tracks
    track_name: string,
    file_path: string
  }>,
  audioFileCount: number             // Number of audio files
}
```

### ViewModel Changes

**File**: `apps/renderer/src/viewmodels/ServiceOrderViewModel.ts`

1. **Enhanced IAudioService Interface**:
   ```typescript
   interface IAudioService {
     loadTracks(folderPath: string): Promise<any>;
     preloadAllTracks(): Promise<void>;
   }
   ```

2. **Real Preload Implementation**:
   - Replaced simulated preload with actual audio service calls
   - Calls `loadTracks()` to load audio files
   - Calls `preloadAllTracks()` to prepare buffers

3. **Auto-Preload in addFolders()**:
   ```typescript
   if (item.type === 'song' && item.hasAudio) {
     this.preloadSong(item).catch(error => {
       // Error handling for failed auto-preloads
     });
   }
   ```

## Error Handling

The system handles errors gracefully:

- **Failed Audio Detection**: Folder classified as regular 'folder' type
- **Failed Preload**: Error logged, but doesn't block service order operations
- **Missing Audio Service**: Preload fails silently, manual load still works
- **Invalid Files**: Skipped during preload, valid files still processed

## Related Features

This feature integrates with:

- **File-Backed Buffers**: Uses the preload system for audio preparation
- **Service Order Management**: Automatic when adding folders
- **Audio Playback**: Prepared tracks ready for instant playback
- **UI Indicators**: Shows preload status in service order manager

## Future Enhancements

Possible improvements:

1. **Folder Watching**: Automatically detect new folders in watched directories
2. **Batch Preload**: Preload multiple songs in parallel with queue management
3. **Smart Prioritization**: Preload songs in playlist order
4. **Disk Space Management**: Check available space before preloading
5. **Preload on Startup**: Restore and preload service order on app launch
