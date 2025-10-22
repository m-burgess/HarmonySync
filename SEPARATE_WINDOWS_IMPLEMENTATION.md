# Separate Windows Implementation

## Overview

Converted PreserviceMusic and Scheduler from embedded modal overlays to separate Tauri windows. This change addresses the issue where YouTube music doesn't work well in embedded frames.

## Changes Made

### 1. New HTML Entry Points

Created standalone HTML files for the new windows:
- `harmonysync/preservice-music.html` - Entry point for Pre-Service Music window
- `harmonysync/scheduler.html` - Entry point for Scheduler window

### 2. New React Entry Points

Created separate entry point JSX files:
- `harmonysync/src/preservice-music-main.jsx` - Renders PreserviceMusicWindow component
- `harmonysync/src/scheduler-main.jsx` - Renders SchedulerWindow component

### 3. New Window Components

Created window-specific components without modal overlays:
- `harmonysync/src/components/screens/PreserviceMusicWindow.jsx` - Pre-Service Music UI for separate window
- `harmonysync/src/components/screens/SchedulerWindow.jsx` - Scheduler UI for separate window

These components are identical to the original modal components but:
- No modal overlay wrapper
- Use `getCurrentWindow().close()` instead of `onClose()` prop
- Fill the entire window with their content

### 4. Tauri Commands

Added two new Tauri commands in `commands.rs`:

```rust
#[command]
pub async fn open_preservice_music_window(app_handle: AppHandle) -> Result<(), String>

#[command]
pub async fn open_scheduler_window(app_handle: AppHandle) -> Result<(), String>
```

These commands:
- Check if window already exists and focus it if so
- Get main window position to open new windows nearby (offset by 50px)
- Create new window with appropriate size and title
- Use WebviewUrl::App to load the HTML file

### 5. App.jsx Changes

Updated the main application:
- Removed modal state variables (`isPreserviceMusicOpen`, `isSchedulerOpen`)
- Changed activity bar click handlers to call Tauri commands
- Updated event listeners for scheduler macros to open/close windows
- Removed modal component renders

### 6. Vite Configuration

Updated `vite.config.js` to include the new HTML files in the build:
```javascript
input: {
  main: 'index.html',
  audience: 'audience.html',
  confidence: 'confidence.html',
  lowerthirds: 'lowerthirds.html',
  'preservice-music': 'preservice-music.html',
  scheduler: 'scheduler.html',
}
```

### 7. Bug Fixes

Fixed unrelated build errors in audio utilities:
- `src/utils/audio/song-transition.js` - Changed import from `./audio.js` to `./audio-nodejs.js`
- `src/utils/audio/streaming-audio.js` - Changed import from `./audio.js` to `./audio-nodejs.js`

## Technical Details

### Window Positioning

Windows are positioned relative to the main window:
```rust
let main_position = main_window.outer_position().map_err(|e| e.to_string())?;
// ...
.position(main_position.x as f64 + 50.0, main_position.y as f64 + 50.0)
```

This ensures the new windows open near the main UI, making them easy to find.

### Window Reuse

If a window is already open, it's brought to focus instead of creating a duplicate:
```rust
if let Some(window) = app_handle.get_webview_window("preservice-music") {
    window.set_focus().map_err(|e| e.to_string())?;
    return Ok(());
}
```

### Window Cleanup

When the main window closes, all child windows are automatically closed by the existing cleanup code in `lib.rs`:
```rust
for (label, other_window) in app_handle.webview_windows() {
    if label != "main" {
        if let Err(e) = other_window.close() {
            eprintln!("Failed to close window {}: {}", label, e);
        }
    }
}
```

## Benefits

1. **Better YouTube Integration**: YouTube embeds work more reliably in native windows vs iframes
2. **Improved UX**: Users can position windows independently
3. **Multi-Monitor Support**: Windows can be moved to different displays
4. **Native Window Controls**: Users get standard OS window management features
5. **Memory Efficiency**: Windows are only created when needed

## Testing Instructions

1. **Open Pre-Service Music Window**:
   - Click the Play icon in the activity bar
   - Window should open near the main window
   - Enter a YouTube playlist URL
   - Verify playlist plays with shuffle and loop

2. **Open Scheduler Window**:
   - Click the Calendar icon in the activity bar
   - Window should open near the main window
   - Create a scheduled event
   - Verify events are saved and displayed

3. **Window Reuse**:
   - Click an icon again while window is open
   - Window should focus instead of creating duplicate

4. **Window Cleanup**:
   - Open both windows
   - Close main window
   - Verify all windows close properly

5. **Scheduler Macro Execution**:
   - Schedule a pre-service music start event
   - Wait for scheduled time
   - Verify pre-service music window opens automatically

## Known Limitations

- Windows open at a fixed offset from main window (could be enhanced to remember last position)
- No parent-child relationship (windows can be minimized/maximized independently)
- YouTube embed still requires internet connection

## Future Enhancements

- Remember window position/size preferences
- Add window state to localStorage
- Support for undocking/docking windows
- Custom window decorations to match app theme
