# Pre-Service Music Feature Implementation

## Overview
Added a new pre-service music feature that allows users to play YouTube Music or YouTube playlists with shuffle and loop enabled.

## Features Implemented

### 1. New Activity Bar Icon
- Added a **Play Icon** (▶️) to the left activity bar for Pre-Service Music
- Increased all activity bar icon sizes from `w-6 h-6` to `w-8 h-8` for better visibility

### 2. Pre-Service Music Component
**Location**: `src/components/screens/PreserviceMusic.jsx`

**Functionality**:
- Modal window that opens in the center of the screen
- Two states:
  1. **First-time setup**: Prompts user to enter a YouTube Music or YouTube playlist URL
  2. **Player mode**: Displays embedded player with saved playlist

### 3. Playlist URL Storage
- Saves playlist URL to JSON file at: `{appDataDir}/preservice-config.json`
- Configuration includes:
  - `preservicePlaylistUrl`: The saved playlist URL
  - `savedAt`: Timestamp of when it was saved
- Automatically loads saved URL on subsequent opens

### 4. YouTube Embed Features
- **Auto-play**: Playlist starts automatically when loaded
- **Loop**: Playlist repeats indefinitely
- **Shuffle**: Plays tracks in random order
- Supports multiple URL formats:
  - YouTube Music playlists: `https://music.youtube.com/playlist?list=...`
  - Regular YouTube playlists: `https://www.youtube.com/playlist?list=...`
  - YouTube embed URLs

### 5. User Interface
**Setup Screen**:
- Clean input form with placeholder text
- Example URLs shown for guidance
- "Save & Play" and "Cancel" buttons

**Player Screen**:
- Full-screen embedded YouTube player
- Status message: "Playing playlist with shuffle and loop enabled"
- "Change Playlist" button to update the URL
- Close button (X) in top-right corner

## Technical Implementation

### Components Updated
1. **App.jsx**
   - Added `PlayIcon` import from Heroicons
   - Added `PreserviceMusic` component import
   - Added state: `isPreserviceMusicOpen`
   - Added activity bar icon with click handler
   - Increased all icon sizes from 6x6 to 8x8
   - Added PreserviceMusic modal component to render tree

2. **PreserviceMusic.jsx** (New)
   - Uses Tauri File System plugin to read/write config
   - Uses Tauri Path API for platform-agnostic paths
   - React hooks for state management
   - URL parsing and embed URL generation
   - Full-screen modal with centered layout

3. **screens/index.js**
   - Added export for PreserviceMusic component

## Usage Flow

1. User clicks the **Play Icon** in the activity bar
2. If no playlist is saved:
   - Modal opens showing input form
   - User pastes YouTube Music/YouTube playlist URL
   - User clicks "Save & Play"
   - URL is saved to JSON file
   - Player loads and starts automatically
3. On subsequent opens:
   - Modal opens directly to player
   - Playlist loads automatically with saved URL
   - User can click "Change Playlist" to update URL

## Dependencies
- `@tauri-apps/api/core` - Tauri core API
- `@tauri-apps/plugin-fs` - File system operations
- `@tauri-apps/api/path` - Path utilities
- `@heroicons/react/24/solid` - XMarkIcon for close button
- `@heroicons/react/24/outline` - PlayIcon for activity bar

## File Structure
```
src/
├── App.jsx (updated)
└── components/
    ├── screens/
    │   ├── PreserviceMusic.jsx (new)
    │   └── index.js (updated)
    └── ui/
        ├── Button.jsx (existing, used)
        └── Input.jsx (existing, used)
```

## Configuration Storage
```json
{
  "preservicePlaylistUrl": "https://music.youtube.com/playlist?list=...",
  "savedAt": "2025-10-15T14:30:00.000Z"
}
```

## Notes
- The embedded player respects YouTube's terms of service
- Shuffle and loop are handled by YouTube's player parameters
- The modal uses a semi-transparent overlay
- Configuration persists across app restarts
- Works offline if YouTube is accessible
