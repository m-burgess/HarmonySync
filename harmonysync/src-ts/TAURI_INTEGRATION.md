# Integrating TypeScript UI with Tauri Backend

This guide explains how to connect the TypeScript UI to the existing Tauri backend.

## Current State

The TypeScript implementation is **UI-complete** but currently uses mock data. To make it fully functional, we need to connect it to the Tauri backend APIs.

## Required Integrations

### 1. Tauri API Setup

The TypeScript app already imports Tauri APIs through the window object:

```typescript
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
  const { event } = (window as any).__TAURI__;
  // Use Tauri APIs
}
```

To properly type this, create a Tauri types file:

```typescript
// src-ts/types/tauri.d.ts
interface Window {
  __TAURI__: {
    event: {
      listen: (event: string, handler: (data: any) => void) => Promise<() => void>;
      emit: (event: string, payload?: any) => Promise<void>;
    };
    core: {
      invoke: (cmd: string, args?: Record<string, any>) => Promise<any>;
    };
  };
}
```

### 2. Backend Commands to Integrate

#### Import Songs/Presentations
```typescript
// In SetlistManager.ts
private async importSong(): Promise<void> {
  if (!window.__TAURI__) return;
  
  const { invoke } = window.__TAURI__.core;
  await invoke('import_song_folder', { folderPath: selectedPath });
}
```

#### Load Song/Presentation Data
```typescript
// In SetlistManager.ts
private async loadItem(index: number): Promise<void> {
  const item = this.serviceOrder[index];
  
  if (item.type === 'song') {
    const data = await window.__TAURI__.core.invoke('get_song_details', { 
      songId: item.id 
    });
    item.slides = this.parseSlides(data.lyrics);
    item.tracks = data.tracks;
  } else {
    const data = await window.__TAURI__.core.invoke('get_presentation_details', { 
      presentationId: item.id 
    });
    item.slides = data.slides;
  }
  
  item.loaded = true;
  this.render();
}
```

#### Load Audio Files
```typescript
// In MultitrackPlayer.ts
private async loadTracks(tracks: Track[]): Promise<void> {
  for (const track of tracks) {
    const audioUrl = await window.__TAURI__.core.invoke('get_track_url', {
      trackId: track.id
    });
    track.url = audioUrl;
    // Initialize Web Audio API with the URL
    await this.loadAudioTrack(track);
  }
}
```

#### Open Display Windows
```typescript
// In SlideManager.ts
private async openScreen(screenType: string): Promise<void> {
  await window.__TAURI__.core.invoke('open_screen', { 
    screenType 
  });
}
```

#### Send Slide to Displays
```typescript
// In SlideManager.ts
private selectSlide(slide: Slide): void {
  this.selectedSlide = slide;
  
  // Send to audience screen
  window.__TAURI__.event.emit('slide-changed', {
    content: slide.content,
    type: slide.type,
    background: slide.background
  });
  
  if (this.options.onSlideSelect) {
    this.options.onSlideSelect(slide);
  }
  
  this.render();
}
```

### 3. Event Listeners

Already implemented in `App.ts`, but needs backend connection:

```typescript
private async setupTauriListeners(): Promise<void> {
  if (!window.__TAURI__) return;
  
  const { event } = window.__TAURI__;

  // Video ended - advance slide
  await event.listen('video-ended', () => {
    this.advanceSlide();
  });

  // Song imported - refresh library
  await event.listen('song-imported', () => {
    // Refresh library list
    this.refreshLibrary();
  });

  // Presentation imported
  await event.listen('presentation-imported', () => {
    this.refreshLibrary();
  });
}
```

### 4. Audio Integration

The multitrack player needs to use Web Audio API with Tauri's audio files:

```typescript
// Create a new file: src-ts/utils/audio.ts
export class AudioManager {
  private audioContext: AudioContext;
  private trackNodes: Map<string, AudioBufferSourceNode>;
  private gainNodes: Map<string, GainNode>;
  private panNodes: Map<string, StereoPannerNode>;
  
  constructor() {
    this.audioContext = new AudioContext();
    this.trackNodes = new Map();
    this.gainNodes = new Map();
    this.panNodes = new Map();
  }
  
  async loadTrack(track: Track): Promise<void> {
    const response = await fetch(track.url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Create audio nodes
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = track.volume;
    
    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = track.pan;
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.audioContext.destination);
    
    // Store references
    this.trackNodes.set(track.id, source);
    this.gainNodes.set(track.id, gainNode);
    this.panNodes.set(track.id, panNode);
  }
  
  setVolume(trackId: string, volume: number): void {
    const gainNode = this.gainNodes.get(trackId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }
  
  setPan(trackId: string, pan: number): void {
    const panNode = this.panNodes.get(trackId);
    if (panNode) {
      panNode.pan.value = pan;
    }
  }
  
  play(): void {
    this.trackNodes.forEach(node => node.start());
  }
  
  stop(): void {
    this.trackNodes.forEach(node => node.stop());
  }
}
```

### 5. Library Component (Optional)

To add library browsing functionality, create a new component:

```typescript
// src-ts/components/library/LibraryPanel.ts
export class LibraryPanel extends Component<HTMLDivElement> {
  private songs: any[] = [];
  private presentations: any[] = [];
  
  async loadLibrary(): Promise<void> {
    this.songs = await window.__TAURI__.core.invoke('search_songs', { 
      query: '' 
    });
    this.presentations = await window.__TAURI__.core.invoke('search_presentations', { 
      query: '' 
    });
    this.render();
  }
  
  render(): void {
    // Render library list
  }
}
```

## Tauri Configuration

Update `tauri.conf.json` to include the TypeScript version:

```json
{
  "build": {
    "devPath": "http://localhost:5174",
    "distDir": "../dist",
    "withGlobalTauri": true
  },
  "tauri": {
    "windows": [
      {
        "title": "HarmonySync",
        "url": "index-ts.html",
        "width": 1280,
        "height": 800
      }
    ]
  }
}
```

## Testing Integration

1. **Start Tauri Dev Mode:**
   ```bash
   cd harmonysync
   npm run tauri dev
   ```

2. **Test Backend Calls:**
   Open browser console and test:
   ```javascript
   // Test invoke
   await window.__TAURI__.core.invoke('get_songs')
   
   // Test events
   await window.__TAURI__.event.emit('test-event', { data: 'test' })
   ```

3. **Add Debug Logging:**
   ```typescript
   console.log('[Tauri]', 'Invoking command:', cmd, args);
   const result = await window.__TAURI__.core.invoke(cmd, args);
   console.log('[Tauri]', 'Result:', result);
   ```

## Migration Checklist

- [ ] Add Tauri type definitions
- [ ] Implement backend command calls
- [ ] Set up event listeners
- [ ] Integrate Web Audio API
- [ ] Test audio playback
- [ ] Test slide navigation
- [ ] Test screen window opening
- [ ] Test song/presentation import
- [ ] Test library loading
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test in Tauri dev mode
- [ ] Build and test production binary

## Error Handling

Add proper error handling for backend calls:

```typescript
private async safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    if (!window.__TAURI__) {
      console.warn('Tauri not available');
      return null;
    }
    return await window.__TAURI__.core.invoke(cmd, args);
  } catch (error) {
    console.error(`Error invoking ${cmd}:`, error);
    // Show user-friendly error message
    this.showError(`Failed to ${cmd}`);
    return null;
  }
}
```

## Next Steps

1. Create Tauri type definitions
2. Implement backend integration in components
3. Add Web Audio API integration
4. Test with real backend
5. Add loading states and error handling
6. Polish and optimize

The UI is ready - just needs to be wired up to the existing Tauri backend! 🚀
