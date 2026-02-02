# HarmonySync Component Hierarchy Map
## Visual Component Tree & Data Flow Analysis

---

## 🌳 Complete Component Tree

```
📱 HarmonySync Application
│
├── 🖥️ Main Window (BrowserWindow)
│   │
│   └── 📄 index.html
│       │
│       └── ⚛️ React Root
│           │
│           └── 🏠 App.jsx ⭐⭐⭐ (ROOT CONTAINER - 470 lines)
│               │
│               ├── STATE (9 hooks):
│               │   ├── allSlides: Slide[]
│               │   ├── allTracks: Track[]
│               │   ├── isLoadingTracks: boolean
│               │   ├── serviceOrder: ServiceItem[]
│               │   ├── selectedSlide: Slide | null
│               │   ├── currentLyrics: string | null
│               │   ├── isDisplaySettingsOpen: boolean
│               │   ├── isAudioSettingsOpen: boolean
│               │   └── sidebarWidth: number
│               │
│               ├── EFFECTS (7+ hooks):
│               │   ├── Listen: 'tracks-updated'
│               │   ├── Listen: 'video-ended'
│               │   ├── Listen: 'display-settings-clicked'
│               │   ├── Listen: 'audio-settings-clicked'
│               │   ├── Listen: 'start-preservice-music'
│               │   ├── Listen: 'stop-preservice-music'
│               │   └── Resize handlers
│               │
│               ├─── 🎨 LAYOUT SECTIONS ───────────────────────────────────
│               │
│               ├── 1️⃣ LEFT: Activity Bar (VSCode-style Navigation)
│               │   │
│               │   ├── 📊 ActivityBarIcon - Service Order (active)
│               │   ├── 📅 ActivityBarIcon - Scheduler
│               │   │   └── onClick → core.invoke('open_scheduler_window')
│               │   ├── ▶️ ActivityBarIcon - Pre-Service Music
│               │   │   └── onClick → core.invoke('open_preservice_music_window')
│               │   ├── 🎵 ActivityBarIcon - Audio/MIDI Settings
│               │   │   └── onClick → setIsAudioSettingsOpen(true)
│               │   └── ⚙️ ActivityBarIcon - Settings
│               │       └── onClick → setIsDisplaySettingsOpen(true)
│               │
│               ├── 2️⃣ SIDEBAR: Service Order (Resizable)
│               │   │
│               │   └── 📋 SetlistManager ⚠️ (CONTAINER - 600+ lines)
│               │       │
│               │       ├── PROPS FROM PARENT:
│               │       │   ├── setAllSlides ⚠️ (mutates parent)
│               │       │   ├── setAllTracks ⚠️ (mutates parent)
│               │       │   ├── setIsLoadingTracks ⚠️ (mutates parent)
│               │       │   ├── setCurrentLyrics ⚠️ (mutates parent)
│               │       │   ├── serviceOrder
│               │       │   └── setServiceOrder ⚠️ (mutates parent)
│               │       │
│               │       ├── LOCAL STATE (7 hooks):
│               │       │   ├── setlist: SetlistItem[]
│               │       │   ├── currentBackgroundCssContent: string
│               │       │   ├── loadingProgress: number
│               │       │   ├── loadingMessage: string
│               │       │   ├── preloadedSongs: Set<string>
│               │       │   ├── crossfadeDuration: number
│               │       │   ├── isFirstLoad: boolean
│               │       │   ├── currentLoadedFolder: string | null
│               │       │   ├── currentSongIndex: number
│               │       │   ├── autoplayEnabled: boolean
│               │       │   └── selectedSongForLyrics: SetlistItem | null
│               │       │
│               │       ├── EFFECTS (3 hooks):
│               │       │   ├── Playback completion → auto-advance
│               │       │   ├── Listen: 'service-imported' → add to setlist
│               │       │   └── Manual click index tracking
│               │       │
│               │       ├── BUSINESS LOGIC ⚠️:
│               │       │   ├── handleAddFolder() → IPC: dialog.open, fs.exists
│               │       │   ├── handleLoadSong() → 80+ lines of loading logic
│               │       │   ├── handlePreloadSong() → preload audio buffers
│               │       │   ├── handleTranspose() → IPC: audio:transposeAudio
│               │       │   └── handleLyricsFetched() → update setlist item
│               │       │
│               │       └── CHILDREN:
│               │           │
│               │           ├── 🎼 SetlistItem ✅ (Presentational)
│               │           │   │
│               │           │   ├── PROPS:
│               │           │   │   ├── item: SetlistItem
│               │           │   │   ├── onLoad: () => void
│               │           │   │   ├── onPreload: () => void
│               │           │   │   ├── onTranspose: () => void
│               │           │   │   └── onFetchLyrics: () => void
│               │           │   │
│               │           │   └── RENDERS:
│               │           │       ├── Song name/icon
│               │           │       ├── Load button
│               │           │       ├── Preload button
│               │           │       ├── Edit button
│               │           │       └── Lyrics indicator
│               │           │
│               │           └── 🎤 LyricsFetcher ⚠️ (Modal with API calls)
│               │               │
│               │               ├── PROPS:
│               │               │   ├── isOpen: boolean
│               │               │   ├── songName: string
│               │               │   ├── folderPath: string
│               │               │   └── onClose: (item) => void
│               │               │
│               │               └── LOGIC:
│               │                   ├── Search lyrics via IPC
│               │                   ├── Save to lyrics.txt
│               │                   └── Notify parent on completion
│               │
│               ├── 🔄 Resize Handle (vertical)
│               │   └── onMouseDown → resize sidebar
│               │
│               ├── 3️⃣ CENTER: Main Content (Conditional Rendering)
│               │   │
│               │   ├── IF currentLyrics !== null:
│               │   │   │
│               │   │   └── 📜 LyricsColumn ⚠️ (CONTAINER - 300+ lines)
│               │   │       │
│               │   │       ├── PROPS:
│               │   │       │   └── lyrics: string
│               │   │       │
│               │   │       ├── LOCAL STATE (3 hooks):
│               │   │       │   ├── selectedIndex: number
│               │   │       │   ├── hoveredIndex: number
│               │   │       │   └── parsedLines: LyricLine[]
│               │   │       │
│               │   │       ├── EFFECTS (2 hooks):
│               │   │       │   ├── Keyboard navigation (arrows, enter)
│               │   │       │   └── Auto-scroll to selected line
│               │   │       │
│               │   │       └── RENDERS:
│               │   │           └── Scrollable lyric pairs with highlighting
│               │   │
│               │   └── ELSE (default):
│               │       │
│               │       └── 🎬 SlideManager ⚠️ (CONTAINER - 500+ lines)
│               │           │
│               │           ├── PROPS:
│               │           │   ├── allSlides: Slide[]
│               │           │   ├── setAllSlides ⚠️ (mutates parent)
│               │           │   ├── selectedSlide: Slide | null
│               │           │   └── setSelectedSlide ⚠️ (mutates parent)
│               │           │
│               │           ├── LOCAL STATE (6 hooks):
│               │           │   ├── thumbnailSize: number
│               │           │   ├── columns: number
│               │           │   ├── gridHeight: number
│               │           │   ├── showImportModal: boolean
│               │           │   ├── gridKey: number (force re-render)
│               │           │   └── dragItem/dragOverItem refs
│               │           │
│               │           ├── EFFECTS (5 hooks):
│               │           │   ├── Grid height calculation (ResizeObserver)
│               │           │   ├── Keyboard navigation (arrows)
│               │           │   ├── Column calculation on resize
│               │           │   ├── Center selected slide in viewport
│               │           │   └── Video transcoding listener
│               │           │
│               │           ├── BUSINESS LOGIC ⚠️:
│               │           │   ├── handleSlidesImported() → update state
│               │           │   ├── handleServiceImported() → emit event
│               │           │   ├── Drag-drop reordering
│               │           │   └── Slide selection + IPC emit
│               │           │
│               │           └── CHILDREN:
│               │               │
│               │               ├── 🖥️ ScreenButtons ✅ (Presentational)
│               │               │   │
│               │               │   └── BUTTONS:
│               │               │       ├── Open Audience Screen
│               │               │       │   └── IPC: window:showAudience
│               │               │       ├── Open Confidence Monitor
│               │               │       │   └── IPC: window:showConfidence
│               │               │       └── Open Lower Thirds
│               │               │           └── IPC: window:showLowerThirds
│               │               │
│               │               ├── 📂 SlideImportModal ⚠️ (Modal with logic)
│               │               │   │
│               │               │   ├── PROPS:
│               │               │   │   ├── isOpen: boolean
│               │               │   │   ├── onClose: () => void
│               │               │   │   ├── onImport: (slides) => void
│               │               │   │   └── onServiceImport: (service) => void
│               │               │   │
│               │               │   └── LOGIC ⚠️:
│               │               │       ├── Import from folder (images/videos)
│               │               │       ├── Import from PDF
│               │               │       ├── Import from PowerPoint
│               │               │       ├── Import from Zip (service package)
│               │               │       └── IPC calls for all imports
│               │               │
│               │               └── 📊 FixedSizeGrid (react-window)
│               │                   │
│               │                   └── Cell Renderer → 🖼️ SlideItem ✅
│               │                       │
│               │                       ├── PROPS:
│               │                       │   ├── slide: Slide
│               │                       │   ├── selected: boolean
│               │                       │   ├── onClick: () => void
│               │                       │   └── onDrag events
│               │                       │
│               │                       └── CHILDREN:
│               │                           │
│               │                           └── 🎞️ Slide ✅ (Pure renderer)
│               │                               │
│               │                               ├── PROPS:
│               │                               │   └── slide: Slide
│               │                               │
│               │                               └── RENDERS:
│               │                                   ├── Image slides → <img>
│               │                                   ├── Video slides → <video>
│               │                                   └── Handles transcoding
│               │
│               ├── 4️⃣ RIGHT: Mixer Sidebar
│               │   │
│               │   └── 🎚️ MixerSidebar ⚠️ (CONTAINER - 150+ lines)
│               │       │
│               │       ├── PROPS:
│               │       │   ├── allTracks: Track[]
│               │       │   └── isLoadingTracks: boolean
│               │       │
│               │       ├── LOCAL STATE (3 hooks):
│               │       │   ├── muteStates: Record<string, boolean>
│               │       │   ├── isPlaying: boolean
│               │       │   └── isOperationInProgress: boolean
│               │       │
│               │       ├── EFFECTS (1 hook):
│               │       │   └── Sync mute states with allTracks
│               │       │
│               │       ├── LOGIC ⚠️:
│               │       │   ├── handleMuteToggle() → setTrackMute()
│               │       │   ├── handlePlayAll() → playAllTracks()
│               │       │   ├── handleStopAll() → stopAllAudio()
│               │       │   └── sortTracks() → custom ordering
│               │       │
│               │       └── RENDERS:
│               │           ├── Play/Stop buttons
│               │           └── Track list (sorted)
│               │               │
│               │               └── 🎛️ TrackControl ✅ → TrackControlCard ✅
│               │                   │
│               │                   ├── PROPS:
│               │                   │   ├── track: Track
│               │                   │   ├── muted: boolean
│               │                   │   └── onMuteToggle: () => void
│               │                   │
│               │                   └── RENDERS:
│               │                       ├── Track name
│               │                       ├── Mute button
│               │                       ├── Volume indicator
│               │                       └── Status indicators
│               │
│               ├── OR: 🎵 MultitrackPlayer ⚠️ (if separate - 400+ lines)
│               │   │
│               │   ├── PROPS:
│               │   │   ├── allTracks: Track[]
│               │   │   └── isLoadingTracks: boolean
│               │   │
│               │   ├── LOCAL STATE (6 hooks):
│               │   │   ├── globalVolume: number
│               │   │   ├── audioServiceStatus: 'connecting' | 'connected' | 'error'
│               │   │   ├── memoryUsage: MemoryInfo
│               │   │   ├── serviceError: string | null
│               │   │   ├── isStartingService: boolean
│               │   │   ├── currentDirectory: string | null
│               │   │   ├── isOperationInProgress: boolean
│               │   │   ├── isTransposeModalOpen: boolean
│               │   │   └── transposeProgress: TransposeProgress
│               │   │
│               │   ├── EFFECTS (4 hooks):
│               │   │   ├── Initialize audio service on mount
│               │   │   ├── Memory monitoring (10s interval)
│               │   │   ├── Update memory display (15s interval)
│               │   │   └── Listen: 'transpose-progress'
│               │   │
│               │   ├── LOGIC ⚠️:
│               │   │   ├── handlePlayAll() → playAllTracks()
│               │   │   ├── handleStopAll() → stopAllAudio()
│               │   │   ├── handleGoToBeginning() → goToBeginningAllTracks()
│               │   │   ├── handleVolumeChange() → setGlobalVolume()
│               │   │   └── handleMuteToggle() → per-track mute
│               │   │
│               │   └── CHILDREN:
│               │       │
│               │       ├── 🎚️ TrackControl (×N) ✅
│               │       │   └── (see above)
│               │       │
│               │       └── 🔀 TransposeModal ✅ (Presentational)
│               │           │
│               │           ├── PROPS:
│               │           │   ├── isOpen: boolean
│               │           │   ├── onClose: () => void
│               │           │   ├── currentDirectory: string
│               │           │   └── progress: TransposeProgress
│               │           │
│               │           └── RENDERS:
│               │               ├── Semitone selector
│               │               ├── Transpose button
│               │               └── Progress bar
│               │
│               ├── 5️⃣ MODAL OVERLAYS (Conditional)
│               │   │
│               │   ├── IF isDisplaySettingsOpen:
│               │   │   │
│               │   │   └── 🖥️ DisplaySettings ⚠️ (CONTAINER - 400+ lines)
│               │   │       │
│               │   │       ├── PROPS:
│               │   │       │   ├── isOpen: boolean
│               │   │       │   └── onClose: () => void
│               │   │       │
│               │   │       ├── LOCAL STATE (5 hooks):
│               │   │       │   ├── displayConfigs: DisplayConfig[]
│               │   │       │   ├── availableDisplays: Display[]
│               │   │       │   ├── audienceFontSettings: FontSettings
│               │   │       │   ├── confidenceFontSettings: FontSettings
│               │   │       │   └── showDisplayForm: boolean
│               │   │       │
│               │   │       ├── EFFECTS (2 hooks):
│               │   │       │   ├── Load display configs on mount
│               │   │       │   └── Load legacy font settings
│               │   │       │
│               │   │       ├── BUSINESS LOGIC ⚠️:
│               │   │       │   ├── handleCreateDisplay() → IPC: displayConfig:create
│               │   │       │   ├── handleUpdateDisplay() → IPC: displayConfig:update
│               │   │       │   ├── handleDeleteDisplay() → IPC: displayConfig:delete
│               │   │       │   ├── handleSaveFontSettings() → write JSON files
│               │   │       │   └── handleToggleDisplay() → enable/disable
│               │   │       │
│               │   │       └── CHILDREN:
│               │   │           │
│               │   │           ├── 🎭 Modal ✅ (Wrapper)
│               │   │           │   └── Contains form content
│               │   │           │
│               │   │           ├── 📝 DisplayFormModal ⚠️ (Nested modal)
│               │   │           │   │
│               │   │           │   ├── LOCAL STATE (4 hooks):
│               │   │           │   │   ├── name: string
│               │   │           │   │   ├── type: 'audience' | 'confidence' | 'lower_thirds'
│               │   │           │   │   ├── deviceId: string | null
│               │   │           │   │   └── ndiOutput: NDIConfig | null
│               │   │           │   │
│               │   │           │   └── FORM:
│               │   │           │       ├── Name input
│               │   │           │       ├── Type selector
│               │   │           │       ├── Device selector
│               │   │           │       └── NDI configuration
│               │   │           │
│               │   │           └── 🔘 Button (×multiple) ✅
│               │   │               ├── New Display
│               │   │               ├── Save
│               │   │               ├── Delete
│               │   │               └── Cancel
│               │   │
│               │   └── IF isAudioSettingsOpen:
│               │       │
│               │       └── 🎵 AudioSettings ⚠️ (CONTAINER - 200+ lines)
│               │           │
│               │           ├── PROPS:
│               │           │   ├── isOpen: boolean
│               │           │   └── onClose: () => void
│               │           │
│               │           ├── LOCAL STATE (3 hooks):
│               │           │   ├── audioOutputDevice: string
│               │           │   ├── midiInputDevice: string
│               │           │   └── midiOutputDevice: string
│               │           │
│               │           ├── EFFECTS (1 hook):
│               │           │   └── Load device lists & settings on mount
│               │           │
│               │           ├── BUSINESS LOGIC ⚠️:
│               │           │   ├── handleSave() → write JSON file
│               │           │   ├── IPC: settings:getAudioDevices
│               │           │   └── IPC: midi:getDevices
│               │           │
│               │           └── CHILDREN:
│               │               │
│               │               ├── 🎭 Modal ✅
│               │               │   └── Settings form
│               │               │
│               │               └── 🔘 Button (×2) ✅
│               │                   ├── Cancel
│               │                   └── Save
│               │
│               └── 📊 VSCodeStatusBar ✅ (Bottom status bar)
│                   └── Shows: Track count, memory usage, etc.
│
├── 🖼️ Audience Window (BrowserWindow)
│   │
│   └── 📄 audience.html
│       │
│       └── ⚛️ AudienceScreen ⚠️ (CONTAINER)
│           │
│           ├── LISTENS:
│           │   └── IPC: 'display-slide' → renders content
│           │
│           └── RENDERS:
│               ├── Slide content (full-screen)
│               ├── Videos with autoplay
│               ├── Images with transitions
│               └── Black screen on command
│
├── 👁️ Confidence Window (BrowserWindow)
│   │
│   └── 📄 confidence.html
│       │
│       └── ⚛️ ConfidenceMonitor ⚠️ (CONTAINER)
│           │
│           ├── LISTENS:
│           │   └── IPC: 'display-confidence-slide' → { current, next }
│           │
│           └── RENDERS:
│               ├── Current slide (left, larger)
│               ├── Next slide (right, smaller)
│               ├── Slide info (type, duration)
│               └── Notes/cues
│
├── 📺 Lower Thirds Window (BrowserWindow)
│   │
│   └── 📄 lowerthirds.html
│       │
│       └── ⚛️ LowerThirdsScreen ⚠️ (CONTAINER)
│           │
│           ├── LISTENS:
│           │   └── IPC: 'update-lower-thirds' → { line1, line2 }
│           │
│           └── RENDERS:
│               ├── Transparent overlay
│               ├── Text lines (bottom 1/3)
│               └── Animated entrance/exit
│
├── 📅 Scheduler Window (Optional BrowserWindow)
│   │
│   └── 📄 scheduler.html
│       │
│       └── ⚛️ SchedulerWindow ⚠️ (CONTAINER)
│           │
│           ├── LOCAL STATE:
│           │   ├── events: ScheduledEvent[]
│           │   ├── selectedEvent: ScheduledEvent | null
│           │   └── showAddModal: boolean
│           │
│           ├── BUSINESS LOGIC ⚠️:
│           │   ├── IPC: scheduler:getAllEvents
│           │   ├── IPC: scheduler:create
│           │   ├── IPC: scheduler:update
│           │   ├── IPC: scheduler:delete
│           │   └── IPC: execute_macro / script:execute
│           │
│           └── CHILDREN:
│               │
│               ├── 📋 EventList ✅
│               │   └── Shows scheduled events
│               │
│               └── 🆕 AddEventModal ⚠️
│                   │
│                   ├── LOGIC ⚠️:
│                   │   ├── IPC: script:getAll
│                   │   └── Create event with script/macro
│                   │
│                   └── FORM:
│                       ├── Event name
│                       ├── Date/time picker
│                       ├── Action type selector
│                       └── Parameters
│
└── 🎶 Pre-Service Music Window (Optional BrowserWindow)
    │
    └── 📄 preservice-music.html
        │
        └── ⚛️ PreserviceMusicWindow ⚠️ (CONTAINER)
            │
            ├── LOCAL STATE:
            │   ├── playlist: Track[]
            │   ├── currentTrackIndex: number
            │   ├── isPlaying: boolean
            │   └── shuffleEnabled: boolean
            │
            └── LOGIC ⚠️:
                ├── Load playlist from folder
                ├── Shuffle/repeat controls
                └── Autoplay next track
```

---

## 🔄 Data Flow Patterns

### **Pattern 1: Props Drilling (Current - PROBLEMATIC)**

```
App.jsx (state owner)
  allSlides: Slide[] ────────┐
  setAllSlides: (Slide[]) => void ───┐
                             │       │
                             ↓       ↓
        SlideManager (receives props, can mutate parent)
          allSlides ─────────┐
          setAllSlides ──────┼──> ❌ MUTATES PARENT STATE
                             ↓
              SlideItem (grandchild)
                onClick={() => setSelectedSlide(slide)} ❌ MUTATES GRANDPARENT
```

**Issues:**
- ❌ Child components directly mutate parent state
- ❌ Hard to track where state changes occur
- ❌ Tight coupling between parent and child

---

### **Pattern 2: IPC Event Broadcasting (Current - RACE CONDITIONS)**

```
Component A (SetlistManager)
  ↓
  IPC: audio:transposeAudio
  ↓
Backend (audio-service)
  ↓ (processes)
  IPC Broadcast: 'tracks-updated' ───────────────┐
                                                 │
  ┌──────────────────────────────────────────────┴──────┐
  ↓                                                      ↓
App.jsx (listening)                    SetlistManager (listening)
  useEffect(() => {                      // Also updates local state
    listen('tracks-updated', tracks => {  setSetlist(...)
      setAllTracks(tracks); ❌           });
    });
  });

Result: TWO state updates for ONE event! ⚠️
```

**Issues:**
- ❌ Multiple components listen to same event
- ❌ Race conditions when both update state
- ❌ No single source of truth

---

### **Pattern 3: Direct IPC Calls from Components (Current - TIGHT COUPLING)**

```
SetlistManager.jsx
  ↓
  async handleAddFolder() {
    const paths = await dialog.open({ ... }); ❌ DIRECT IPC CALL
    const exists = await fs.exists(path);     ❌ DIRECT FS ACCESS
    
    // Business logic mixed with IPC ❌
    if (exists) {
      const tracks = await loadTracks(path);
      setSetlist([...setlist, { path, tracks }]);
    }
  }
```

**Issues:**
- ❌ Business logic in UI components
- ❌ Hard to test (need to mock entire Electron API)
- ❌ No abstraction layer

---

### **Pattern 4: MVVM Target (DESIRED)**

```
View (Component)
  ↓ read properties
  ViewModel (Observable State)
    ├── setlist: Observable<SetlistItem[]>
    ├── isLoading: Observable<boolean>
    └── commands:
        ├── addFolder() → calls service
        └── loadSong() → calls service
  ↓ delegate
  Service (Business Logic)
    ├── AudioService
    ├── FileService
    └── DisplayService
  ↓ IPC
  Backend (Electron Services)
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Testable business logic (ViewModels)
- ✅ Thin view layer (just JSX)
- ✅ Single source of truth (ViewModel state)

---

## 📊 State Distribution Map

```
┌─────────────────────────────────────────────────────────────┐
│                   STATE OWNERSHIP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  App.jsx (GLOBAL STATE - 9 hooks) ⚠️ TOO MUCH              │
│  ├── allSlides ───────────────> SlideManager               │
│  ├── allTracks ───────────────> MultitrackPlayer           │
│  │                          └─> MixerSidebar                │
│  ├── selectedSlide ───────────> SlideManager               │
│  ├── currentLyrics ───────────> LyricsColumn               │
│  ├── serviceOrder ────────────> SetlistManager             │
│  ├── isLoadingTracks ─────────> SetlistManager             │
│  │                          └─> MultitrackPlayer            │
│  ├── isDisplaySettingsOpen ───> DisplaySettings (modal)    │
│  ├── isAudioSettingsOpen ─────> AudioSettings (modal)      │
│  └── sidebarWidth ────────────> CSS inline style           │
│                                                             │
│  SetlistManager (LOCAL STATE - 7 hooks) ⚠️                 │
│  ├── setlist ───────────────> Own state (duplicate?)       │
│  ├── currentBackgroundCss ──> Internal                     │
│  ├── loadingProgress ───────> Internal                     │
│  ├── loadingMessage ────────> Internal                     │
│  ├── preloadedSongs ────────> Internal cache               │
│  ├── crossfadeDuration ─────> Audio config                 │
│  ├── isFirstLoad ───────────> Boolean flag                 │
│  ├── currentLoadedFolder ───> Path string                  │
│  ├── currentSongIndex ──────> Playback position            │
│  ├── autoplayEnabled ───────> Boolean flag                 │
│  └── selectedSongForLyrics ─> Modal state                  │
│                                                             │
│  SlideManager (LOCAL STATE - 6 hooks) ⚠️                   │
│  ├── thumbnailSize ─────────> UI state                     │
│  ├── columns ───────────────> Grid layout                  │
│  ├── gridHeight ────────────> UI state                     │
│  ├── showImportModal ───────> Modal state                  │
│  ├── gridKey ───────────────> Force re-render              │
│  └── drag refs ─────────────> Drag-drop state              │
│                                                             │
│  MultitrackPlayer (LOCAL STATE - 6 hooks) ⚠️               │
│  ├── globalVolume ──────────> Audio state                  │
│  ├── audioServiceStatus ────> Connection state             │
│  ├── memoryUsage ───────────> Performance metric           │
│  ├── serviceError ──────────> Error state                  │
│  ├── isStartingService ─────> Loading state                │
│  ├── currentDirectory ──────> Path state                   │
│  ├── isOperationInProgress ─> Debounce flag                │
│  ├── isTransposeModalOpen ──> Modal state                  │
│  └── transposeProgress ─────> Progress state               │
│                                                             │
│  MixerSidebar (LOCAL STATE - 3 hooks) ✅ GOOD              │
│  ├── muteStates ────────────> Per-track mute               │
│  ├── isPlaying ─────────────> Playback state               │
│  └── isOperationInProgress ─> Debounce flag                │
│                                                             │
│  LyricsColumn (LOCAL STATE - 3 hooks) ✅ GOOD              │
│  ├── selectedIndex ─────────> Selection state              │
│  ├── hoveredIndex ──────────> Hover state                  │
│  └── parsedLines ───────────> Parsed lyrics                │
│                                                             │
│  DisplaySettings (LOCAL STATE - 5 hooks) ⚠️                │
│  ├── displayConfigs ────────> Display list                 │
│  ├── availableDisplays ─────> Hardware list                │
│  ├── audienceFontSettings ──> Font config                  │
│  ├── confidenceFontSettings ─> Font config                 │
│  └── showDisplayForm ───────> Modal state                  │
│                                                             │
│  AudioSettings (LOCAL STATE - 3 hooks) ⚠️                  │
│  ├── audioOutputDevice ─────> Device ID                    │
│  ├── midiInputDevice ───────> Device ID                    │
│  └── midiOutputDevice ──────> Device ID                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

LEGEND:
⚠️  = Too much state, needs refactoring
✅  = Appropriate local state
```

---

## 🎯 MVVM Target Structure

### **Desired Component Tree (Post-Conversion)**

```
App (Thin Coordinator)
│
├── ViewModelProvider (Dependency Injection)
│   │
│   ├── Services:
│   │   ├── AudioService
│   │   ├── FileService
│   │   ├── DisplayService
│   │   └── SlideService
│   │
│   └── ViewModels:
│       ├── SetlistViewModel
│       ├── SlideViewModel
│       ├── AudioViewModel
│       └── DisplayViewModel
│
├── SetlistView (Pure Presentation)
│   ├── Props: viewModel={SetlistViewModel}
│   └── Bindings:
│       ├── viewModel.setlist → display
│       ├── viewModel.addFolder() → button click
│       └── viewModel.loadSong() → item click
│
├── SlideView (Pure Presentation)
│   ├── Props: viewModel={SlideViewModel}
│   └── Bindings:
│       ├── viewModel.slides → grid
│       ├── viewModel.selectedSlide → highlight
│       └── viewModel.selectSlide() → click
│
├── AudioView (Pure Presentation)
│   ├── Props: viewModel={AudioViewModel}
│   └── Bindings:
│       ├── viewModel.tracks → list
│       ├── viewModel.play() → button
│       └── viewModel.stop() → button
│
└── DisplaySettingsView (Pure Presentation)
    ├── Props: viewModel={DisplayViewModel}
    └── Bindings:
        ├── viewModel.configs → list
        ├── viewModel.createDisplay() → button
        └── viewModel.deleteDisplay() → button
```

---

## 📈 Component Size Analysis

| Component | Current Lines | Target Lines (MVVM) | Reduction |
|-----------|--------------|---------------------|-----------|
| **App.jsx** | 470 | 150 | -68% |
| **SetlistManager** | 600+ | 80 | -87% |
| **SlideManager** | 500+ | 100 | -80% |
| **MultitrackPlayer** | 400+ | 80 | -80% |
| **MixerSidebar** | 150 | 60 | -60% |
| **DisplaySettings** | 400+ | 100 | -75% |
| **AudioSettings** | 200+ | 80 | -60% |
| **LyricsColumn** | 300+ | 80 | -73% |
| **TOTAL** | 3020+ | 730 | **-76%** |

**New Files (ViewModels):**
- SetlistViewModel.js (~300 lines)
- SlideViewModel.js (~250 lines)
- AudioViewModel.js (~300 lines)
- DisplayViewModel.js (~200 lines)
- Services (~400 lines combined)
- **TOTAL NEW:** ~1450 lines

**Net Change:** ~600 lines reduction + better separation

---

## ✅ Refactoring Priority

### **High Priority (Week 1-2)**
1. 🔴 **SetlistManager** → SetlistViewModel + SetlistView
   - Most complex, highest business logic
   - Critical path for song loading
   
2. 🔴 **SlideManager** → SlideViewModel + SlideView
   - Core functionality
   - Heavy state management

### **Medium Priority (Week 3-4)**
3. 🟠 **MultitrackPlayer** → AudioViewModel + AudioView
   - Audio service orchestration
   - Service initialization logic

4. 🟠 **DisplaySettings** → DisplayViewModel + DisplaySettingsView
   - CRUD operations
   - IPC-heavy

### **Low Priority (Week 5-6)**
5. 🟡 **MixerSidebar** → MixerViewModel + MixerView
   - Simpler state
   - Less business logic

6. 🟡 **App.jsx** → Split into multiple coordinator components
   - After child components are refactored
   - Final cleanup

---

## 🎓 Key Takeaways

1. **Current Architecture:**
   - ❌ Business logic scattered across 8+ container components
   - ❌ 42+ useState hooks, 25+ useEffect hooks
   - ❌ Props drilling 3 levels deep
   - ❌ Direct IPC calls from UI components

2. **MVVM Benefits:**
   - ✅ Business logic in testable ViewModels
   - ✅ Thin view components (< 100 lines)
   - ✅ Single source of truth
   - ✅ Dependency injection for mocking

3. **Refactoring Strategy:**
   - Start with most complex components (SetlistManager, SlideManager)
   - Extract services first (AudioService, FileService)
   - Create ViewModels with observable state
   - Convert components to thin views
   - Wire with DI container

4. **Expected Outcomes:**
   - 76% reduction in component code
   - 90%+ testable business logic
   - Easier maintenance and feature additions
   - Better separation of concerns

---

**End of Component Hierarchy Map**
