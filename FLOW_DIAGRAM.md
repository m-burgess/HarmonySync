# MOGG Implementation Flow Diagram

## Import Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Selects Song Folder                    │
│                  (contains audio files + lyrics.txt)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              import_song_folder() - Backend                     │
│  1. Extract song title from folder name                         │
│  2. Check for duplicates                                        │
│  3. Read lyrics.txt                                             │
│  4. Find all audio files (WAV, MP3, FLAC, etc.)                 │
│  5. Sort files alphabetically                                   │
│  6. Validate track count (max 32)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         convert_to_mogg_helper() - FFmpeg Processing            │
│                                                                  │
│  For each audio file:                                           │
│    ┌────────────────────────────────────────┐                  │
│    │  Input: track1.wav (stereo/mono)      │                  │
│    │  Filter: pan=mono|c0=FC                │                  │
│    │  Output: [a0] mono channel             │                  │
│    └────────────────────────────────────────┘                  │
│                                                                  │
│  Merge all mono channels:                                       │
│    ┌────────────────────────────────────────┐                  │
│    │  [a0][a1][a2]...[aN]                   │                  │
│    │  join=inputs=N:channel_layout=N        │                  │
│    │  Output: multi-channel OGG (MOGG)      │                  │
│    └────────────────────────────────────────┘                  │
│                                                                  │
│  Result: song_multitrack.ogg                                    │
│    - N channels (one per input file)                            │
│    - All channels mono                                          │
│    - Vorbis codec, quality 4                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Copy to Song Library + Database                    │
│                                                                  │
│  File System:                                                   │
│    /song_library/SongName/song_multitrack.ogg                   │
│                                                                  │
│  Database - songs table:                                        │
│    ┌─────────────────────────────────────────────────────┐     │
│    │ id  title    lyrics    mogg_file_path              │     │
│    │ 1   "Song"   "..."     "/path/to/song_multitrack.ogg" │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                  │
│  Database - tracks table:                                       │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ id  song_id  file_path               track_name       │  │
│    │ 1   1        "/path/to/song_mult..."  "Drums:0"       │  │
│    │ 2   1        "/path/to/song_mult..."  "Bass:1"        │  │
│    │ 3   1        "/path/to/song_mult..."  "Guitar:2"      │  │
│    │ 4   1        "/path/to/song_mult..."  "Vocals:3"      │  │
│    └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Playback Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                   User Clicks Song in Setlist                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               get_song_details() - Backend                      │
│  Returns:                                                        │
│    - Song metadata (title, lyrics)                              │
│    - Track list with format "TrackName:ChannelIndex"            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            SetlistManager.jsx - Track Loading                   │
│                                                                  │
│  For each track:                                                │
│    ┌──────────────────────────────────────────────┐            │
│    │ Parse track_name: "Drums:0"                  │            │
│    │   ↓                                           │            │
│    │ Track name: "Drums"                          │            │
│    │ Channel index: 0                             │            │
│    └──────────────────────────────────────────────┘            │
│                 │                                               │
│                 ▼                                               │
│    ┌──────────────────────────────────────────────┐            │
│    │ loadMoggChannel(file_path, 0)                │            │
│    └──────────────────────────────────────────────┘            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           loadMoggChannel() - Web Audio API                     │
│                                                                  │
│  Step 1: Load MOGG file                                         │
│    ┌────────────────────────────────────────────────────┐      │
│    │ fetch(mogg_file_path)                              │      │
│    │   ↓                                                 │      │
│    │ ArrayBuffer                                         │      │
│    │   ↓                                                 │      │
│    │ audioContext.decodeAudioData()                     │      │
│    │   ↓                                                 │      │
│    │ MultiChannelBuffer (N channels)                    │      │
│    └────────────────────────────────────────────────────┘      │
│                                                                  │
│  Step 2: Extract Channel                                        │
│    ┌────────────────────────────────────────────────────┐      │
│    │ multiChannelBuffer.getChannelData(channelIndex)    │      │
│    │   ↓                                                 │      │
│    │ Float32Array (channel data)                        │      │
│    └────────────────────────────────────────────────────┘      │
│                                                                  │
│  Step 3: Create Mono Buffer                                     │
│    ┌────────────────────────────────────────────────────┐      │
│    │ audioContext.createBuffer(1, length, sampleRate)   │      │
│    │   ↓                                                 │      │
│    │ monoBuffer.getChannelData(0).set(channelData)      │      │
│    │   ↓                                                 │      │
│    │ MonoAudioBuffer (ready for playback)               │      │
│    └────────────────────────────────────────────────────┘      │
│                                                                  │
│  Step 4: Cache and Return                                       │
│    Cache key: "/path/to/mogg:0"                                 │
│    Returns: MonoAudioBuffer                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Create Track Object for Multitrack Player          │
│                                                                  │
│    track = {                                                    │
│      buffer: monoBuffer,      // Extracted channel              │
│      name: "Drums",           // Clean name (no :0)             │
│      gainNode: ...,           // Volume control                 │
│      pannerNode: ...,         // Pan control                    │
│      individualVolume: 0.7,   // Initial volume                 │
│      panValue: 0,             // Initial pan (center)           │
│      isPlaying: false,        // Playback state                 │
│      isMuted: false,          // Mute state                     │
│      // ... other controls                                      │
│    }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Multitrack Player Ready                        │
│                                                                  │
│  All tracks loaded and independent:                             │
│    [Drums:0]   ━━━━━━━━━━━━━ [▶] [M] [S] [Pan: -1/0/+1]        │
│    [Bass:1]    ━━━━━━━━━━━━━ [▶] [M] [S] [Pan: -1/0/+1]        │
│    [Guitar:2]  ━━━━━━━━━━━━━ [▶] [M] [S] [Pan: -1/0/+1]        │
│    [Vocals:3]  ━━━━━━━━━━━━━ [▶] [M] [S] [Pan: -1/0/+1]        │
│                                                                  │
│  Features:                                                       │
│    ✓ Individual volume control                                  │
│    ✓ Individual mute/solo                                       │
│    ✓ Individual panning                                         │
│    ✓ Perfect synchronization (all from same file)               │
│    ✓ Default pan: click/guide left, others right                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
┌────────────────┐
│  Audio Files   │ (WAV, MP3, etc.)
└───────┬────────┘
        │ Import
        ▼
┌────────────────┐
│  MOGG File     │ (Multi-channel OGG)
│  - Channel 0   │ ← Track 1 (mono)
│  - Channel 1   │ ← Track 2 (mono)
│  - Channel 2   │ ← Track 3 (mono)
│  - Channel N   │ ← Track N (mono)
└───────┬────────┘
        │ Playback
        ▼
┌────────────────┐
│ Channel Extract│
│  Channel 0 ────┼──→ Track Object 1
│  Channel 1 ────┼──→ Track Object 2
│  Channel 2 ────┼──→ Track Object 3
│  Channel N ────┼──→ Track Object N
└────────────────┘
        │
        ▼
┌────────────────┐
│ Multitrack     │
│ Player         │
│ - Independent  │
│ - Synchronized │
│ - Controllable │
└────────────────┘
```

## Benefits Visualization

```
Before MOGG:
┌─────────────────┐
│ Song Folder     │
├─────────────────┤
│ track1.ogg      │ → Individual file
│ track2.ogg      │ → Individual file
│ track3.ogg      │ → Individual file
│ track4.ogg      │ → Individual file
│ lyrics.txt      │
└─────────────────┘
- Multiple files
- Potential sync issues
- Slower loading
- More storage

After MOGG:
┌─────────────────┐
│ Song Folder     │
├─────────────────┤
│ song_multi.ogg  │ → Single multi-channel file
│                 │   (contains all tracks)
│ lyrics.txt      │
└─────────────────┘
✓ Single file
✓ Perfect sync
✓ Faster loading
✓ Less storage
✓ Same functionality
```

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (JavaScript)                 │
├──────────────────────────────────────────────────────────────┤
│  SetlistManager.jsx                                          │
│    - Detects MOGG files                                      │
│    - Parses channel indices                                  │
│    - Creates track objects                                   │
│                                                               │
│  audio.js                                                     │
│    - loadMoggChannel()                                       │
│    - Channel extraction                                      │
│    - Buffer caching                                          │
│                                                               │
│  Web Audio API                                               │
│    - decodeAudioData()                                       │
│    - getChannelData()                                        │
│    - createBuffer()                                          │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ IPC
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         Backend (Rust/Tauri)                  │
├──────────────────────────────────────────────────────────────┤
│  commands.rs                                                  │
│    - import_song_folder()                                    │
│    - convert_to_mogg_helper()                                │
│    - get_song_details()                                      │
│                                                               │
│  entities.rs                                                  │
│    - Song (with mogg_file_path)                              │
│    - Track (with channel index)                              │
│                                                               │
│  sqlite_repository.rs                                         │
│    - Database schema                                          │
│    - CRUD operations                                          │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      External Tools                           │
├──────────────────────────────────────────────────────────────┤
│  FFmpeg                                                       │
│    - Audio format conversion                                  │
│    - Mono conversion (pan filter)                            │
│    - Channel merging (join filter)                           │
│    - Vorbis encoding                                         │
│                                                               │
│  SQLite                                                       │
│    - songs table                                             │
│    - tracks table                                            │
│    - Relationships                                           │
└──────────────────────────────────────────────────────────────┘
```
