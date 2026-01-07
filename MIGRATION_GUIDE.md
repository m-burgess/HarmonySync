# Migration Guide: Tauri to Electron

## Overview

HarmonySync has been migrated from Tauri (Rust) to Electron (Node.js) to provide:
- **Better cross-platform compatibility**
- **Easier development and contribution**
- **Google Drive integration for cloud audio sync**
- **More robust audio synchronization**
- **Simplified installation (no Rust toolchain required)**

## What Changed

### Architecture
- **Backend**: Rust → Node.js (Electron)
- **Frontend**: React (unchanged, but uses different IPC)
- **Audio Service**: Integrated Node.js service (enhanced)
- **Database**: SQLite (unchanged, but using better-sqlite3)

### Features Added
- ✅ Google Drive integration for audio file sync
- ✅ Enhanced audio synchronization before playback
- ✅ Improved FFmpeg integration
- ✅ Better error handling and logging

### Features Maintained
- ✅ All multitrack audio playback features
- ✅ Audio transposition with FFmpeg
- ✅ Video transcoding and streaming
- ✅ Multiple display windows (Audience, Confidence, Lower Thirds)
- ✅ Lyrics fetching from Genius API
- ✅ Scheduler functionality
- ✅ DMX lighting control
- ✅ MIDI input/output

## Installation

### New Prerequisites
- **Node.js 16.x or higher** (was: Rust + Tauri)
- **npm** (package manager)
- **FFmpeg** (unchanged - still required)

### Installation Steps

1. **Update your local repository:**
```bash
git pull origin main
cd harmonysync
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run the application:**
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run electron
```

## Data Migration

### Database
Your existing SQLite database is **fully compatible**. No migration needed.

Location unchanged:
- **Windows**: `%APPDATA%/harmonysync/`
- **Linux**: `~/.config/harmonysync/`
- **macOS**: `~/Library/Application Support/harmonysync/`

### Song Libraries
All your existing song folders work without changes. The new version:
- Supports all the same audio formats
- Uses the same folder structure
- Maintains all mixer configurations
- Preserves lyrics files

### Settings
Most settings are preserved. You may need to reconfigure:
- Display assignments (if you use multiple monitors)
- MIDI device selections
- DMX fixture configurations

## New Features to Explore

### Google Drive Integration

Set up cloud sync for your worship music library:

1. Follow the [Google Drive Setup Guide](GOOGLE_DRIVE_SETUP.md)
2. Authenticate with your Google account
3. Select folders to sync
4. Audio files are automatically downloaded and kept in sync

### Enhanced Audio Sync

The new audio service ensures all tracks are properly synchronized:
- Files are pre-loaded before playback
- Transposed audio is cached efficiently
- Better handling of large multitrack sessions

## Troubleshooting

### Application won't start

**Error**: "electron: command not found"
**Solution**: Run `npm install` to install dependencies

**Error**: "Cannot find module 'electron'"
**Solution**: Delete `node_modules` and run `npm install` again

### Audio not playing

**Check**:
1. FFmpeg is installed and in PATH: `ffmpeg -version`
2. Audio service is running (check status in app)
3. Files are in supported formats (MP3, WAV, OGG, FLAC, M4A)

### Display windows not opening

**Check**:
1. Your display configuration in Settings
2. Try closing and reopening the windows
3. Check console for error messages (F12 in main window)

### Migration Issues

If you encounter issues during migration:

1. **Backup your data** (database and song folders)
2. Try a clean installation:
   ```bash
   cd harmonysync
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Check the application logs:
   - **Windows**: `%APPDATA%/harmonysync/logs/`
   - **Linux**: `~/.config/harmonysync/logs/`
   - **macOS**: `~/Library/Logs/harmonysync/`

## Development Changes

### For Contributors

If you were developing with the Rust/Tauri version:

1. **Remove Rust toolchain** (optional, no longer needed)
2. **Familiarize with Electron**:
   - Main process: `electron/main.cjs`
   - Preload script: `electron/preload.cjs`
   - Backend modules: `electron/modules/`

3. **API Changes**:
   - `invoke()` calls remain the same (compatibility layer)
   - Event system works the same way
   - New Google Drive API available

4. **Building**:
   ```bash
   # Development
   npm run dev
   
   # Production build
   npm run build
   ```

### Testing

The frontend remains React-based, so existing tests should work with minimal changes. Backend tests need to be updated for Node.js instead of Rust.

## Performance

The Electron version maintains similar performance:
- **Startup time**: Comparable to Tauri
- **Memory usage**: Slightly higher (Electron overhead)
- **CPU usage**: Similar, FFmpeg still does heavy lifting
- **Audio latency**: Improved with better sync

## Getting Help

- **Documentation**: Check [README.md](README.md)
- **Google Drive**: See [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md)
- **Issues**: Report bugs on GitHub
- **Questions**: Open a discussion on GitHub

## Rollback (If Needed)

If you need to go back to the Tauri version:

```bash
git checkout <previous-tauri-commit>
npm install
# Follow old Tauri setup instructions
```

Note: The Tauri version will not receive future updates.

---

**Thank you for using HarmonySync!** This migration sets us up for exciting new features and easier community contributions.
