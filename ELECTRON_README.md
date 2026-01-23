# HarmonySync - Node.js/Electron Conversion

This project has been converted from Rust/Tauri to Node.js/Electron while maintaining all features.

## Architecture

### Backend (Node.js/Electron)
- **Main Process**: `/electron/main.js` - Application entry point
- **Services**: `/electron/services/` - Backend functionality
  - `json-storage.js` - JSON-based data persistence (replaces SQLite for portability)
  - `ffmpeg.js` - Audio/video processing and transposition
  - `http-server.js` - Video streaming server
  - `file-manager.js` - File system operations
  - `midi-manager.js` - MIDI device control
  - `lyrics-fetcher.js` - Genius API integration
  - `google-drive.js` - Google Drive sync

### Frontend (React)
- **Location**: `/harmonysync/src/`
- **Adapter**: `/harmonysync/src/electron-adapter/` - Compatibility layer for Tauri→Electron

### Audio Service
- **Location**: `/harmonysync-audio-service/`
- Node.js service for multitrack audio playback

## Installation

```bash
# Install root dependencies (Electron)
npm install

# Install frontend dependencies
cd harmonysync
npm install
cd ..

# Install audio service dependencies
cd harmonysync-audio-service
npm install
cd ..
```

## Development

```bash
# Run in development mode
npm run dev
```

This will:
1. Start the Vite dev server for React (port 5174)
2. Start Electron in development mode
3. Audio service starts automatically

## Building

```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

## Key Features

### Audio System
- **FFmpeg Transposition**: Transpose audio files before playback
- **Audio Sync**: Ensures all tracks are synced before playback starts
- **Multitrack Player**: Control individual tracks with volume, pan, and mute

### Google Drive Integration
- Authenticate with Google Drive
- Sync audio files from Drive folders
- Automatic download and cache management

### Display System
- Multiple windows: Main, Audience, Confidence, Lower Thirds
- Video playback with streaming
- Real-time slide display

### MIDI Control
- Send MIDI notes to external devices
- Lighting and automation control

## Configuration

### Google Drive Setup
1. Create a Google Cloud project
2. Enable Google Drive API
3. Download credentials JSON
4. Save as `gdrive-credentials.json` in user data directory

### Environment Variables
- `GENIUS_API_TOKEN` - For lyrics fetching
- `NODE_ENV` - `development` or `production`

## Migration Notes

### Removed Components
- All Rust code in `/harmonysync/src-tauri/`
- Cargo dependencies and build files
- Tauri configuration

### New Components
- Electron main process and IPC system
- Node.js backend services
- Google Drive integration
- Audio sync mechanism

## Troubleshooting

### Audio Service Won't Start
- Check port 3001 is available
- Verify Node.js audio service dependencies

### FFmpeg Errors
- Ensure FFmpeg is installed and in PATH
- Check file permissions

### MIDI Not Working
- Verify MIDI devices are connected
- Check system MIDI permissions

## Development Tools

### Available Commands
- `npm start` - Run production build
- `npm run dev` - Development mode with hot reload
- `npm run audio-service` - Run audio service standalone
- `cd harmonysync && npm run build` - Build frontend only

## API Reference

See `/electron/preload.js` for full IPC API documentation.

### Key APIs
- `window.electronAPI.convertToOgg()` - Convert audio to Ogg
- `window.electronAPI.transposeAudio()` - Transpose audio files
- `window.electronAPI.googleDriveSyncFolder()` - Sync from Google Drive
- `window.electronAPI.displaySlide()` - Display slide on screens
