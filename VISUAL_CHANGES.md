# Visual Changes: Separate Windows Implementation

## Before (Modal Overlay)

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Window                            │
│  ┌──────────┐                                               │
│  │ Activity │  ┌────────────────────────────────────┐       │
│  │   Bar    │  │      Main Content Area             │       │
│  │          │  │                                     │       │
│  │  [♫]     │  │                                     │       │
│  │  [📅]    │  │                                     │       │
│  │  [▶]     │  │                                     │       │
│  │          │  │                                     │       │
│  └──────────┘  └────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⬛ BLACK OVERLAY (Modal)                                ││
│  │                                                          ││
│  │  ┌────────────────────────────────────────┐             ││
│  │  │  Pre-Service Music         [X]         │             ││
│  │  ├────────────────────────────────────────┤             ││
│  │  │                                         │             ││
│  │  │  [YouTube Embed - doesn't work well]   │             ││
│  │  │                                         │             ││
│  │  └────────────────────────────────────────┘             ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Issues with Modal Approach
❌ YouTube embeds don't work reliably in modals
❌ Modal blocks main window interaction
❌ Can't move to different monitor
❌ Can't resize/position independently
❌ Limited by modal overlay constraints

## After (Separate Windows)

```
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│      Main Window                │   │   Pre-Service Music Window      │
│  ┌──────────┐                   │   ├──────────────────────────────────┤
│  │ Activity │  ┌───────────┐    │   │                                  │
│  │   Bar    │  │   Main    │    │   │  ┌────────────────────────────┐ │
│  │          │  │  Content  │    │   │  │                            │ │
│  │  [♫]     │  │   Area    │    │   │  │   YouTube Playlist         │ │
│  │  [📅]    │  │           │    │   │  │   ▶️ Playing with shuffle  │ │
│  │  [▶]←────┼──┼───────────┘    │   │  │                            │ │
│  │          │  │                │   │  │   [Change Playlist]        │ │
│  └──────────┘  └───────────┘    │   │  │                            │ │
│                                 │   │  └────────────────────────────┘ │
└─────────────────────────────────┘   └──────────────────────────────────┘
                                                    ↑
                                       Opens at main_position + 50px

┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│      Main Window                │   │      Scheduler Window           │
│  ┌──────────┐                   │   ├──────────────────────────────────┤
│  │ Activity │  ┌───────────┐    │   │  Schedule New Event              │
│  │   Bar    │  │   Main    │    │   │  ┌────────────────────────────┐ │
│  │          │  │  Content  │    │   │  │ Macro: [Start Pre-Music ▼] │ │
│  │  [♫]     │  │   Area    │    │   │  │ Day:   [Saturday       ▼] │ │
│  │  [📅]←───┼──┼───────────┘    │   │  │ Time:  [16:30]            │ │
│  │  [▶]     │  │                │   │  │ ☑ Recurring weekly        │ │
│  │          │  │                │   │  └────────────────────────────┘ │
│  └──────────┘  └───────────┘    │   │                                  │
│                                 │   │  Scheduled Events                │
│                                 │   │  ☑ Start Music - Sat 16:30       │
└─────────────────────────────────┘   └──────────────────────────────────┘
                                                    ↑
                                       Opens at main_position + 50px
```

### Benefits of Separate Windows
✅ YouTube embeds work perfectly
✅ Can position independently
✅ Multi-monitor support
✅ Native window controls
✅ Main window stays interactive
✅ Can resize each window independently

## User Interaction Flow

### Opening PreserviceMusic Window

```
User clicks [▶] icon
        ↓
App.jsx calls: invoke('open_preservice_music_window')
        ↓
Rust command checks: window exists?
        ↓
   Yes: Focus existing window
   No:  Create new window at main_pos + (50, 50)
        ↓
PreserviceMusicWindow.jsx renders
        ↓
User enters YouTube playlist URL
        ↓
URL saved to config file
        ↓
YouTube player loads with shuffle + loop
```

### Window Reuse

```
Window is open
        ↓
User clicks [▶] icon again
        ↓
Rust command: window.set_focus()
        ↓
Window comes to front (no duplicate created)
```

### Scheduled Event

```
Scheduler event triggers at 16:30
        ↓
execute_macro('start_preservice_music')
        ↓
Emits: 'start-preservice-music' event
        ↓
App.jsx listens for event
        ↓
Calls: invoke('open_preservice_music_window')
        ↓
PreserviceMusic window opens automatically!
```

### Window Cleanup

```
User closes main window
        ↓
lib.rs on_window_event handler
        ↓
for each window != "main":
    window.close()
        ↓
All child windows close automatically
```

## Component Comparison

### Modal Component (Before)
```jsx
// Wrapped in modal overlay
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="modal-content">
    {/* Content */}
  </div>
</div>

// Closed via props
onClose={() => setIsOpen(false)}
```

### Window Component (After)
```jsx
// Full window content
<div className="h-screen w-screen bg-gray-800">
  {/* Content */}
</div>

// Closed via Tauri API
const window = getCurrentWindow();
await window.close();
```

## File Structure

```
harmonysync/
├── preservice-music.html          ← New: HTML entry point
├── scheduler.html                 ← New: HTML entry point
├── src/
│   ├── preservice-music-main.jsx  ← New: React entry point
│   ├── scheduler-main.jsx         ← New: React entry point
│   ├── App.jsx                    ← Modified: Removed modal state
│   └── components/
│       └── screens/
│           ├── PreserviceMusic.jsx          ← Old: Modal version (not used)
│           ├── PreserviceMusicWindow.jsx    ← New: Window version
│           ├── Scheduler.jsx                ← Old: Modal version (not used)
│           └── SchedulerWindow.jsx          ← New: Window version
└── src-tauri/
    └── src/
        ├── lib.rs                 ← Modified: Added commands
        └── application/
            └── commands.rs        ← Modified: Added window commands
```

## Build Output

```bash
$ npm run build

dist/
├── preservice-music.html          ✅ New window entry
├── scheduler.html                 ✅ New window entry
├── assets/
│   ├── preservice-music-*.js      ✅ Window bundle
│   ├── scheduler-*.js             ✅ Window bundle
│   └── main-*.js                  ✅ Main app bundle
```

## Summary

The change converts embedded modal overlays into independent Tauri windows, solving the YouTube embed reliability issue while improving user experience with native window management features.

**Visual Impact**: 
- Users see separate windows instead of modal overlays
- Windows can be positioned anywhere, including on different monitors
- YouTube content plays reliably in native windows
- Overall UI appearance remains consistent
