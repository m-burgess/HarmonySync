# Multi-Stream OGG (MOGG) Implementation

## Overview
This implementation adds support for converting multiple audio tracks from a song folder into a single multi-channel OGG file (MOGG) during the import process. The frontend can then load this MOGG file and extract individual channels for playback in the multitrack player.

## Changes Made

### 1. Backend - Database Schema
**File**: `harmonysync/src-tauri/src/infrastructure/sqlite_repository.rs`

- Added `mogg_file_path` column to the `songs` table
- Added migration to support existing databases
- Updated all SQL queries to include the new field

### 2. Backend - Entity Updates
**File**: `harmonysync/src-tauri/src/domain/entities.rs`

- Added `mogg_file_path: Option<String>` to the `Song` struct

### 3. Backend - MOGG Conversion
**File**: `harmonysync/src-tauri/src/application/commands.rs`

Added new function `convert_to_mogg_helper()` that:
- Takes multiple audio files as input
- Converts each to mono using ffmpeg's pan filter
- Merges all mono tracks into a single multi-channel OGG file
- Emits progress events for UI feedback

Example ffmpeg command structure:
```bash
ffmpeg -i track1.wav -i track2.wav -i track3.wav \
  -filter_complex "[0:a]pan=mono|c0=0.5*c0+0.5*c1[a0];[1:a]pan=mono|c0=0.5*c0+0.5*c1[a1];[2:a]pan=mono|c0=0.5*c0+0.5*c1[a2];[a0][a1][a2]join=inputs=3:channel_layout=3[out]" \
  -map "[out]" -c:a libvorbis -q:a 4 output.ogg
```

### 4. Backend - Import Process
**File**: `harmonysync/src-tauri/src/application/commands.rs`

Updated `import_song_folder()` function:
- Sorts audio files to ensure consistent track ordering
- Calls `convert_to_mogg_helper()` instead of individual OGG conversions
- Stores the MOGG file path in the Song entity
- Saves track metadata with channel index (format: "TrackName:ChannelIndex")
- All Track records point to the same MOGG file

### 5. Frontend - Audio Loading
**File**: `harmonysync/src/audio.js`

Added new function `loadMoggChannel()` that:
- Loads the multi-channel MOGG file
- Extracts a specific channel using Web Audio API
- Creates a mono buffer from the extracted channel
- Caches the extracted channel for performance

### 6. Frontend - Track Loading
**File**: `harmonysync/src/SetlistManager.jsx`

Updated song loading logic:
- Detects MOGG files by checking for ":" in track_name
- Parses channel index from track_name
- Calls `loadMoggChannel()` for MOGG tracks
- Falls back to `loadAudioFile()` for legacy single-file tracks
- Maintains backward compatibility

## How It Works

### Import Flow
1. User selects a song folder containing audio files and lyrics.txt
2. System finds all audio files (WAV, MP3, AIFF, FLAC, M4A)
3. Files are sorted alphabetically for consistent ordering
4. All audio files are converted to mono and merged into one MOGG file
5. MOGG file is saved to the song library
6. Database stores:
   - Song with mogg_file_path
   - Track records with format "TrackName:ChannelIndex" in track_name field
   - All tracks point to the same MOGG file path

### Playback Flow
1. User clicks a song in the setlist
2. Frontend fetches song details including track info
3. For each track:
   - If track_name contains ":", it's a MOGG track
   - Extract track name and channel index
   - Load specific channel from MOGG file using Web Audio API
   - Create track object with mono buffer
4. Tracks are added to the multitrack player
5. Default panning is applied (click/guide left, others right)
6. User can play, mute, solo, and pan individual tracks

## Benefits

1. **Storage Efficiency**: One multi-channel file instead of multiple separate files
2. **Sync Accuracy**: All tracks are guaranteed to be perfectly synced
3. **Faster Loading**: Single file load with channel extraction vs. multiple file loads
4. **Cleaner Organization**: Song folders contain one audio file instead of many
5. **Backward Compatible**: System still supports old songs with individual OGG files

## Technical Details

### Multi-Channel OGG Format
- Each input audio file becomes one channel in the output
- All channels are mono (converted from stereo if needed)
- Uses Vorbis codec (libvorbis) with quality setting 4
- Sample rate and duration match the input files

### Web Audio API Channel Extraction
- `AudioBuffer.getChannelData(index)` extracts specific channel
- Creates new mono AudioBuffer with extracted data
- Caching prevents repeated extraction of same channel
- Works with OGG files up to 255 channels (Web Audio API limit)

### Database Schema
```sql
-- Songs table
CREATE TABLE songs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    lyrics TEXT,
    mogg_file_path TEXT  -- New field
);

-- Tracks table (unchanged structure)
CREATE TABLE tracks (
    id INTEGER PRIMARY KEY,
    song_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,      -- Points to MOGG file
    track_name TEXT,               -- Format: "TrackName:ChannelIndex"
    FOREIGN KEY (song_id) REFERENCES songs (id)
);
```

## Testing

### Manual Testing Steps
1. Start the application: `cargo run --bin HarmonySync`
2. Import a new song folder with multiple audio tracks
3. Verify MOGG file is created in song library
4. Load the song in the setlist
5. Verify all tracks appear in multitrack player
6. Test playback, mute, solo, and panning for each track
7. Verify sync between tracks is maintained

### Expected Results
- Song imports successfully
- Single .ogg file in song library folder
- All tracks load and play correctly
- Tracks are perfectly synchronized
- Individual track controls work as expected

## Future Enhancements
1. Add re-import functionality to convert old songs to MOGG format
2. Add option to export individual tracks from MOGG
3. Support for more than 255 tracks (if needed)
4. Compression settings UI for MOGG quality control
