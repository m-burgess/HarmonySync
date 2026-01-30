# Audio Mixer Component Architecture

## Data Flow: Backend → Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                    Audio Service Backend                         │
│                (harmonysync-audio-service)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
                    ┌────────▼────────┐
                    │  Track State    │
                    │  ├─ id          │
                    │  ├─ name        │ ◄─── ADDED!
                    │  ├─ filePath    │ ◄─── ADDED!
                    │  ├─ duration    │
                    │  ├─ volume      │
                    │  ├─ pan         │
                    │  ├─ isMuted     │
                    │  └─ isPlaying   │
                    └────────┬────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                        │
┌────────▼────────┐                   ┌──────────▼──────────┐
│  audio-nodejs.js│                   │ SetlistManager.jsx  │
│                 │                   │                     │
│  addTracks()    │                   │  Load Song          │
│  ├─ Creates     │                   │  ├─ Read tracks     │
│  │  song        │                   │  ├─ Call addTracks()│
│  ├─ Returns     │                   │  └─ Update state    │
│  │  track info  │                   │                     │
│  └─ With names! │◄──────────────────┤  setAllTracks([...])│
└─────────────────┘                   └─────────────────────┘
         │
         │ Track Array
         │
┌────────▼──────────────────────────────────────────────────────┐
│                       App.jsx State                            │
│  const [allTracks, setAllTracks] = useState([                 │
│    {                                                           │
│      id: "uuid",                                              │
│      name: "Acoustic Guitar",  ◄─── From backend!            │
│      path: "/path/to/file.mp3",                              │
│      panValue: 0,                                             │
│      isMuted: false,                                          │
│      isPlaying: false,                                        │
│      individualVolume: 0.7                                    │
│    }                                                           │
│  ])                                                            │
└────────┬───────────────────────────────────────────────────────┘
         │
         │ Props
         │
┌────────▼────────────────────────────────────────────────────┐
│              MultitrackPlayer Component                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Empty State (no tracks)                               │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │         🎵                                        │ │ │
│  │  │   No Audio Tracks Loaded                         │ │ │
│  │  │   Select a song to load tracks                   │ │ │
│  │  │   💡 Tip: Click names to mute/unmute            │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Loaded State (tracks visible)                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ [8 tracks]        💡 Click to mute/unmute        │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ │
│  │  │Track1│ │Track2│ │Track3│ │Track4│ │Track5│ ...  │ │
│  │  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘      │ │
│  │     │        │        │        │        │            │ │
│  └─────┼────────┼────────┼────────┼────────┼────────────┘ │
│        │        │        │        │        │                │
│  ┌─────▼────────▼────────▼────────▼────────▼────────────┐ │
│  │              TrackControl Components                   │ │
│  │  (One for each track)                                 │ │
│  └─────┬──────────────────────────────────────────────────┘ │
│        │                                                      │
└────────┼──────────────────────────────────────────────────────┘
         │
         │ Individual Track Props
         │
┌────────▼──────────────────────────────────────────────────┐
│              TrackControl Component                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Manages state for one track                         │ │
│  │  - Local mute state                                   │ │
│  │  - Local pan state                                    │ │
│  │  - Calls audio service on changes                    │ │
│  └────────┬─────────────────────────────────────────────┘ │
│           │                                                 │
│           │ Passes display props                           │
│           │                                                 │
│  ┌────────▼─────────────────────────────────────────────┐ │
│  │        TrackControlCard Component                     │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │  Visual Presentation Layer                     │  │ │
│  │  │                                                 │  │ │
│  │  │  ┌──────────────────────────────────────────┐ │  │ │
│  │  │  │  🔊 Acoustic Guitar Track              │ │  │ │
│  │  │  │  [Gradient background]                  │ │  │ │
│  │  │  │  [Blue hover border]                    │ │  │ │
│  │  │  │                                          │ │  │ │
│  │  │  │      L  ◄────●────►  R                 │ │  │ │
│  │  │  │         Pan Control                     │ │  │ │
│  │  │  └──────────────────────────────────────────┘ │  │ │
│  │  │                                                 │  │ │
│  │  │  Features:                                     │  │ │
│  │  │  ✅ Track name from backend                   │  │ │
│  │  │  ✅ Status icon (🔊/🔇)                      │  │ │
│  │  │  ✅ Truncation for long names                 │  │ │
│  │  │  ✅ Tooltip with full info                    │  │ │
│  │  │  ✅ Mute toggle on click                      │  │ │
│  │  │  ✅ Visual state changes                      │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
User Action: Click Track Name
         │
         ▼
┌────────────────────┐
│ TrackControlCard   │
│ onClick handler    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ TrackControl       │
│ handleMuteToggle() │
└────────┬───────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ setTrackMute │   │ Update local │
│ (audio.js)   │   │ state        │
└──────┬───────┘   └──────────────┘
       │
       ▼
┌──────────────────┐
│ Audio Service    │
│ /api/tracks/mute │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ WebSocket broadcast  │
│ mixer_state_changed  │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────┐
│ All components update   │
│ with new mixer state    │
└─────────────────────────┘
```

## CSS Styling Architecture

```
TrackControlCard.css
│
├─── Base Styles
│    ├─ .track-control-card          (container)
│    ├─ .track-control-simplified    (volunteer layout)
│    └─ .track-pan-section           (pan controls)
│
├─── Button Styles
│    ├─ .track-name-button           (main clickable area)
│    │   ├─ Normal state             (gray gradient)
│    │   ├─ Hover state              (blue border, lift)
│    │   ├─ Active state             (pressed effect)
│    │   └─ Muted state              (red gradient)
│    │
│    ├─ .track-status-icon           (🔊/🔇 icons)
│    │   ├─ .active-icon             (pulse animation)
│    │   └─ .muted-icon              (static, dimmed)
│    │
│    └─ .track-display-name          (text content)
│        └─ Truncation/ellipsis
│
├─── State Styles
│    ├─ .track-muted                 (dimmed appearance)
│    ├─ .track-solo                  (highlighted)
│    └─ :hover                       (interactive feedback)
│
└─── Responsive Breakpoints
     ├─ Desktop (> 1024px)           (160px cards)
     ├─ Tablet (768-1024px)          (140px cards)
     └─ Mobile (< 768px)             (120px cards)
```

## State Management

```
┌─────────────────────────────────────────────────────────┐
│                   Application State                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Global (App.jsx)                                        │
│  ├─ allTracks: Track[]       ◄─── Master list           │
│  ├─ isLoadingTracks: boolean                            │
│  └─ serviceOrder: Item[]                                 │
│                                                           │
│  MultitrackPlayer                                        │
│  ├─ globalVolume: number                                │
│  ├─ audioServiceStatus: string                          │
│  └─ transposeProgress: object                           │
│                                                           │
│  TrackControl (per track)                               │
│  ├─ isMuted: boolean         ◄─── Local state           │
│  └─ panValue: number         ◄─── Local state           │
│                                                           │
│  Audio Service (singleton)                              │
│  ├─ tracks: Map<id, Track>                              │
│  ├─ isPlaying: boolean                                  │
│  └─ masterVolume: number                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Event Flow

```
User Loads Song
      │
      ▼
SetlistManager.loadTracks()
      │
      ├─► Read folder/database
      │
      ├─► Call addTracks(paths)
      │        │
      │        ├─► Audio Service: createSong()
      │        │        │
      │        │        ├─► Load each track file
      │        │        └─► Return mixer state
      │        │
      │        └─► Map to UI format
      │
      └─► setAllTracks([...])
           │
           ▼
      App.jsx updates
           │
           ▼
      MultitrackPlayer re-renders
           │
           ├─► Show track count
           ├─► Render grid of TrackControls
           └─► Each TrackControl renders TrackControlCard
                     │
                     ▼
                UI displays track with:
                ✅ Name from backend
                ✅ Status icon
                ✅ Pan control
                ✅ Interactive buttons
```

## Key Design Decisions

### 1. **Separation of Concerns**
- **Backend:** Audio processing & track management
- **Frontend:** UI presentation & user interaction
- **State:** React state for UI, Audio Service for playback

### 2. **Props Down, Events Up**
- Parent passes track data down via props
- Children emit events up for state changes
- Unidirectional data flow

### 3. **Local State for Interactions**
- TrackControl maintains local mute/pan state
- Syncs with audio service on change
- Prevents stale UI during updates

### 4. **Progressive Enhancement**
- Basic functionality works without JavaScript
- CSS handles visual states
- JavaScript adds interactivity

### 5. **Responsive by Default**
- Mobile-first CSS
- Flexbox/Grid for layout
- Breakpoints for device sizes

## Performance Considerations

```
┌──────────────────────────────────────────────┐
│         Performance Optimizations             │
├──────────────────────────────────────────────┤
│                                               │
│  1. Pure CSS Animations                      │
│     ├─ Hardware accelerated                 │
│     ├─ No JavaScript overhead               │
│     └─ Smooth 60fps                          │
│                                               │
│  2. Efficient Re-renders                     │
│     ├─ React.memo on pure components        │
│     ├─ Minimal state updates                │
│     └─ Debounced audio API calls            │
│                                               │
│  3. Lazy Loading                             │
│     ├─ Tracks loaded on demand              │
│     ├─ Images lazy loaded                   │
│     └─ Code splitting                        │
│                                               │
│  4. WebSocket for Real-time                  │
│     ├─ Efficient state sync                 │
│     ├─ Low latency updates                  │
│     └─ Automatic reconnection               │
│                                               │
└──────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────┐
│            Error Recovery Flow               │
├─────────────────────────────────────────────┤
│                                              │
│  Backend Error                              │
│       │                                      │
│       ├─► Catch in audio-nodejs.js         │
│       │        │                            │
│       │        ├─► Log to console          │
│       │        └─► Throw with context      │
│       │                                      │
│       ├─► Catch in SetlistManager          │
│       │        │                            │
│       │        ├─► Show error message      │
│       │        └─► Reset loading state     │
│       │                                      │
│       └─► Display to user                  │
│                │                            │
│                ├─► Red error banner         │
│                ├─► Helpful message          │
│                └─► Action button            │
│                    (Start Service)          │
│                                              │
└─────────────────────────────────────────────┘
```

## Summary

This architecture provides:

✅ **Clear data flow** from backend to UI  
✅ **Separation of concerns** across layers  
✅ **Efficient updates** with minimal re-renders  
✅ **Error resilience** with graceful degradation  
✅ **User-friendly** with visual feedback  
✅ **Maintainable** with documented components  
✅ **Scalable** for future enhancements

The volunteer-friendly design sits on top of this solid foundation, making it easy to use without sacrificing technical quality.
