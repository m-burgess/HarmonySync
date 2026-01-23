# Migration Guide: Tauri to Electron

This guide helps you complete the migration from the Rust/Tauri application to the new Node.js/Electron implementation.

## Current Status

✅ **Completed:**
- Electron infrastructure created
- All backend services converted to Node.js
- IPC communication system established
- Google Drive integration added
- FFmpeg service with transposition support
- Audio sync mechanism implemented
- Compatibility adapter layer created

⚠️ **In Progress:**
- Frontend components need to import electron-adapter
- Rust code still present (will be removed)

## Step-by-Step Migration

### 1. Update React Component Imports

All React components that currently use Tauri APIs need to be updated:

**Before:**
```javascript
import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
```

**After:**
```javascript
import { core, fs, dialog } from '../electron-adapter';
// Or import all:
import TauriCompat from '../electron-adapter';
```

The adapter automatically detects whether running in Tauri or Electron and uses the appropriate API.

### 2. Update API Calls

The adapter provides a compatible interface, so most calls remain the same:

**Before (Tauri):**
```javascript
await invoke('convert_to_ogg', { input_path: path, output_dir: dir });
```

**After (Electron via adapter):**
```javascript
await core.invoke('convert_to_ogg', { input_path: path, output_dir: dir });
```

### 3. Component-Specific Updates

#### Files to Update:
- `harmonysync/src/App.jsx` - Main app component
- `harmonysync/src/components/audio/MultitrackPlayer.jsx` - Audio player
- `harmonysync/src/components/setlist/SetlistManager.jsx` - Setlist management
- `harmonysync/src/components/slides/SlideManager.jsx` - Slide management
- Any component using `invoke()`, file operations, or dialogs

### 4. Remove Rust Code

Once frontend is working with Electron:

```bash
# Remove Rust backend
rm -rf harmonysync/src-tauri

# Remove Cargo configuration
rm -f harmonysync/Cargo.toml
rm -f harmonysync/Cargo.lock

# Update harmonysync/package.json scripts
# Remove: "tauri", "tauri:dev", "tauri:build"
```

### 5. Update Build Configuration

**harmonysync/package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Remove Tauri CLI from devDependencies:
- `@tauri-apps/cli`

### 6. Testing Checklist

Test each feature:
- [ ] Import song folders
- [ ] Display slides on audience window
- [ ] Multitrack audio playback
- [ ] FFmpeg transposition (up/down semitones)
- [ ] Audio sync verification
- [ ] Video playback with streaming
- [ ] Google Drive authentication
- [ ] Google Drive folder sync
- [ ] Lyrics fetching
- [ ] MIDI note sending (if available)
- [ ] Scheduler functionality
- [ ] Display settings
- [ ] Confidence monitor
- [ ] Lower thirds display

### 7. Google Drive Setup

For audio file sync from Google Drive:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Drive API"
4. Create OAuth 2.0 credentials
5. Download credentials JSON
6. Save to: `~/.config/harmonysync-electron/gdrive-credentials.json` (Linux/Mac)
   Or: `%APPDATA%/harmonysync-electron/gdrive-credentials.json` (Windows)

### 8. Environment Variables

Create a `.env` file in the root:

```env
# Optional: For lyrics fetching
GENIUS_API_TOKEN=your_genius_api_token

# Development mode
NODE_ENV=development
```

### 9. Known Differences

**Tauri → Electron Changes:**

1. **Window Management**: 
   - Tauri: `WebviewWindow`
   - Electron: `BrowserWindow`

2. **File Paths**:
   - Tauri: Uses platform-specific paths via `@tauri-apps/api/path`
   - Electron: Uses Node.js `path` module in main process

3. **IPC**:
   - Tauri: `invoke()` commands
   - Electron: `ipcRenderer.invoke()` via preload script

4. **Asset Protocol**:
   - Tauri: `asset://` protocol
   - Electron: HTTP server on `http://127.0.0.1:8765`

### 10. Troubleshooting

**Problem: "window.electronAPI is undefined"**
- Solution: Ensure preload script is loaded in BrowserWindow configuration

**Problem: FFmpeg not found**
- Solution: Install FFmpeg and add to system PATH

**Problem: Audio service won't start**
- Solution: Check port 3001 is available, verify harmonysync-audio-service dependencies

**Problem: Database errors**
- Solution: Delete old database file, let it recreate on first run

### 11. Development Workflow

```bash
# Terminal 1: Start Electron app
npm run dev

# Terminal 2 (optional): Monitor audio service logs
cd harmonysync-audio-service
npm run dev

# Build for production
npm run build
```

### 12. Deployment

**Linux:**
```bash
npm run build:linux
# Creates: dist-electron/harmonysync_1.0.0_amd64.deb
```

**Windows:**
```bash
npm run build:win
# Creates: dist-electron/HarmonySync Setup 1.0.0.exe
```

**macOS:**
```bash
npm run build:mac
# Creates: dist-electron/HarmonySync-1.0.0.dmg
```

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│          Electron Main Process          │
│  ┌───────────────────────────────────┐  │
│  │  main.js - Application Entry      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Services (Node.js)               │  │
│  │  - json-storage.js                │  │
│  │  - ffmpeg.js (transposition)      │  │
│  │  - http-server.js                 │  │
│  │  - google-drive.js                │  │
│  │  - midi-manager.js                │  │
│  │  - lyrics-fetcher.js              │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │ IPC (preload.js)
┌──────────────┴──────────────────────────┐
│       Renderer Process (React)          │
│  ┌───────────────────────────────────┐  │
│  │  electron-adapter                 │  │
│  │  (Tauri compatibility layer)      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  React Components                 │  │
│  │  - App.jsx                        │  │
│  │  - MultitrackPlayer.jsx           │  │
│  │  - SlideManager.jsx               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│    Standalone Audio Service (Node.js)   │
│    harmonysync-audio-service/           │
│    - Socket.IO connection               │
│    - Multitrack audio mixing            │
└─────────────────────────────────────────┘
```

## Questions?

If you encounter issues during migration:
1. Check the ELECTRON_README.md for setup details
2. Review electron/preload.js for available IPC APIs
3. Check browser console for errors
4. Review main process logs (Electron terminal)

## Rollback Plan

If you need to rollback to Tauri:
1. The Rust code is still in `harmonysync/src-tauri/`
2. Revert package.json changes
3. Remove electron/ directory
4. Run `npm run tauri:dev` as before

The new Electron implementation is fully separate and doesn't break the existing Tauri version.
