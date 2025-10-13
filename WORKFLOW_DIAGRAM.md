# Cloud Folder Export/Import Workflow

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       INITIAL IMPORT WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────┘

User has source audio files (WAV, MP3, etc.) in a folder
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 1: Import Song Folder                                           │
│                                                                       │
│  Source Folder/                                                       │
│  ├── track1.wav                                                       │
│  ├── track2.mp3                                                       │
│  ├── track3.aiff                                                      │
│  └── lyrics.txt                                                       │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 2: Conversion (ffmpeg)                                          │
│                                                                       │
│  ⚙️  Converting track1.wav → track1.ogg (mono, 44.1kHz, q:3)        │
│  ⚙️  Converting track2.mp3 → track2.ogg (mono, 44.1kHz, q:3)        │
│  ⚙️  Converting track3.aiff → track3.ogg (mono, 44.1kHz, q:3)       │
│                                                                       │
│  ⏱️  Time: ~30-40 seconds for 5 tracks                               │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 3: Storage in Song Library                                      │
│                                                                       │
│  ~/Library/AppData/harmonysync/song_library/Amazing Grace/           │
│  ├── 00_track1.ogg                                                    │
│  ├── 01_track2.ogg                                                    │
│  ├── 02_track3.ogg                                                    │
│  └── (lyrics stored in database)                                     │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
                  Song ready for playback!


┌─────────────────────────────────────────────────────────────────────┐
│                    EXPORT TO CLOUD WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────┘

User wants to share song or use on another machine
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 1: Click Export Button in Song Library                          │
│                                                                       │
│  🔍 [Search: Amazing Grace]                                           │
│                                                                       │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Amazing Grace                    [📥] [+]  │                    │
│  └─────────────────────────────────────────────┘                    │
│                                        ↑                              │
│                                  Export button                        │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 2: Select Destination Folder                                    │
│                                                                       │
│  📁 Choose destination:                                               │
│     ~/Google Drive/HarmonySync Songs/                                 │
│     ~/Dropbox/HarmonySync Songs/                                      │
│     ~/OneDrive/HarmonySync Songs/                                     │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 3: Export Process                                               │
│                                                                       │
│  ✓ Copy 00_track1.ogg → destination                                  │
│  ✓ Copy 01_track2.ogg → destination                                  │
│  ✓ Copy 02_track3.ogg → destination                                  │
│  ✓ Write lyrics.txt                                                   │
│  ✓ Generate background.css                                            │
│                                                                       │
│  ⏱️  Time: ~1-2 seconds (no conversion!)                             │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 4: Exported Folder Structure                                    │
│                                                                       │
│  ~/Google Drive/HarmonySync Songs/Amazing Grace/                     │
│  ├── 00_track1.ogg                                                    │
│  ├── 01_track2.ogg                                                    │
│  ├── 02_track3.ogg                                                    │
│  ├── lyrics.txt                                                       │
│  └── background.css                                                   │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
         ☁️  Cloud storage syncs folder automatically


┌─────────────────────────────────────────────────────────────────────┐
│              IMPORT FROM CLOUD WORKFLOW (FAST!)                      │
└─────────────────────────────────────────────────────────────────────┘

Another machine with same cloud folder synced
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 1: Import Song Folder from Cloud                                │
│                                                                       │
│  File → Import → Song                                                 │
│  Select: ~/Google Drive/HarmonySync Songs/Amazing Grace/             │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 2: Smart Detection                                              │
│                                                                       │
│  🔍 Scanning folder...                                                │
│  ✓ Found 3 OGG files                                                  │
│  ✓ All files already in correct format!                              │
│  ✓ Skipping conversion...                                             │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Step 3: Direct Copy (No Conversion!)                                 │
│                                                                       │
│  📋 Copy 00_track1.ogg → song library                                 │
│  📋 Copy 01_track2.ogg → song library                                 │
│  📋 Copy 02_track3.ogg → song library                                 │
│  📋 Read lyrics.txt                                                   │
│  📋 Store in database                                                 │
│                                                                       │
│  ⏱️  Time: ~1-2 seconds (20-40x faster!)                             │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
                  Song ready for playback!


┌─────────────────────────────────────────────────────────────────────┐
│                        KEY BENEFITS                                  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────┬────────────────────┬─────────────────────────┐
│  Traditional Way   │   Export/Import    │       Benefit           │
├────────────────────┼────────────────────┼─────────────────────────┤
│ Import: 30-40 sec  │ Import: 1-2 sec    │ 20-40x faster          │
│ Convert every time │ Convert once       │ Reuse conversions      │
│ Store source files │ Store only OGG     │ Save storage space     │
│ No sharing         │ Easy cloud sharing │ Team collaboration     │
│ Manual transfer    │ Auto cloud sync    │ Seamless workflow      │
└────────────────────┴────────────────────┴─────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    USE CASE EXAMPLES                                 │
└─────────────────────────────────────────────────────────────────────┘

1. WORSHIP TEAM SCENARIO
   ┌─────────────────────────────────────────────────────────┐
   │ Music Director (Computer A)                              │
   │ • Imports songs from original WAV files                  │
   │ • Exports to Google Drive                                │
   └─────────────────┬───────────────────────────────────────┘
                     │
                     ↓ Google Drive sync
                     ↓
   ┌─────────────────┴───────────────────────────────────────┐
   │ Sound Technician (Computer B)                            │
   │ • Imports from Google Drive (pre-converted)              │
   │ • Ready to use in 2 seconds                              │
   └─────────────────────────────────────────────────────────┘

2. MULTI-LOCATION CHURCHES
   ┌─────────────────────────────────────────────────────────┐
   │ Main Campus                                              │
   │ • Exports Sunday's setlist                               │
   └─────────────────┬───────────────────────────────────────┘
                     │
                     ↓ Dropbox sync
                     ↓
   ┌─────────────────┴───────────────────────────────────────┐
   │ Satellite Campus                                         │
   │ • Imports same songs instantly                           │
   │ • Consistent setup across locations                      │
   └─────────────────────────────────────────────────────────┘

3. BACKUP AND RESTORE
   ┌─────────────────────────────────────────────────────────┐
   │ Old Computer                                             │
   │ • Export entire library to OneDrive                      │
   └─────────────────┬───────────────────────────────────────┘
                     │
                     ↓ OneDrive sync
                     ↓
   ┌─────────────────┴───────────────────────────────────────┐
   │ New Computer                                             │
   │ • Import library from OneDrive                           │
   │ • Full library restored in minutes                       │
   └─────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    TECHNICAL FLOW                                    │
└─────────────────────────────────────────────────────────────────────┘

Frontend (React/JSX)
    │
    │ User clicks export button
    │
    ↓
TauriDialog.open() → Select destination folder
    │
    ↓
Tauri.core.invoke('export_song_folder')
    │
    │ IPC call to backend
    │
    ↓
Backend (Rust)
    │
    ├─→ Query SQLite database for song/track data
    │
    ├─→ Create destination folder
    │
    ├─→ Copy each OGG file (fs::copy)
    │
    ├─→ Write lyrics.txt (fs::write)
    │
    ├─→ Generate background.css (css_generator::generate_and_write_css)
    │
    └─→ Return success/error
    │
    ↓
Frontend displays result to user
