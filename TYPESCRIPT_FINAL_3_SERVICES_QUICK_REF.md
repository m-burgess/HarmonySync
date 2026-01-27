# Final 3 Services - Quick Reference Card

## 🎵 Audio Service

### Import
```typescript
import { AudioService, getAudioService } from './services/audio-service';
```

### Basic Usage
```typescript
const audioService = getAudioService();
await audioService.initialize();

// Convert to OGG with progress
const oggPath = await audioService.convertToOgg(
  '/path/to/input.mp3',
  '/output/directory',
  (progress) => {
    console.log(`${progress.percent}% - ${progress.message}`);
  }
);

// Transpose audio (±12 semitones)
const result = await audioService.transposeAudio(
  '/path/to/song/directory',
  2,  // Transpose up 2 semitones
  (tracks) => console.log('Transposed tracks:', tracks)
);

// Check audio sync
const syncStatus = await audioService.ensureAudioSync([
  '/path/to/track1.mp3',
  '/path/to/track2.mp3'
]);

// Get metadata
const metadata = await audioService.getAudioMetadata('/path/to/audio.mp3');
console.log(`Duration: ${metadata.duration}s`);

// Normalize audio
const normalized = await audioService.normalizeAudio(
  '/path/to/input.mp3',
  -23  // Target level in dB
);
```

### Key Features
- ✅ OGG conversion with progress tracking
- ✅ Audio transposition (preserves rhythm sections)
- ✅ Sync verification across multiple tracks
- ✅ Metadata extraction (duration, codec, sample rate, etc.)
- ✅ Audio normalization with loudnorm filter
- ✅ FFmpeg integration with type-safe callbacks

### Transposition Intelligence
The service automatically detects rhythm section tracks and copies them without transposition:
- Tracks with "guide", "click", "drums", "percussion", "shakers" in the name

---

## 🎹 MIDI Manager

### Import
```typescript
import { MIDIManager, getMIDIManager } from './services/midi-manager';
```

### Basic Usage
```typescript
const midiManager = getMIDIManager();
await midiManager.initialize();

// Check if MIDI is available
if (midiManager.isMIDIAvailable()) {
  // List devices
  const devices = await midiManager.getDevices();
  console.log('Available MIDI devices:', devices);
  
  // Send note (deviceId, note, velocity, duration)
  await midiManager.sendNote(0, 60, 127, 100);
  
  // Send Control Change
  await midiManager.sendCC(0, 7, 100);  // CC 7 = Volume
  
  // Send raw MIDI message
  await midiManager.sendRawMessage(0, [0x90, 60, 127]);
  
  // Check port status
  if (midiManager.isPortOpen()) {
    console.log('MIDI port is open');
  }
  
  // Close connection
  midiManager.close();
} else {
  console.log('MIDI not available - install with: npm install midi');
}
```

### Key Features
- ✅ Optional dependency (graceful degradation)
- ✅ Device detection and enumeration
- ✅ Note On/Off messaging
- ✅ Control Change (CC) support
- ✅ Raw MIDI message support
- ✅ Automatic port management
- ✅ Validation of MIDI values (0-127)

### MIDI Installation
```bash
npm install midi
```

If not installed, the service will still initialize but log warnings when MIDI operations are attempted.

---

## 🔌 Scripting API

### Import
```typescript
import { ScriptingAPIService, getScriptingAPIService } from './services/scripting-api';
import type { HarmonySyncAPI } from './services/scripting-api';
```

### Basic Setup
```typescript
const scriptingAPI = getScriptingAPIService();
await scriptingAPI.initialize();

// Inject service references
scriptingAPI.setServices({
  displayService,
  audioService,
  videoService,
  windowService,
  macroService,
  imageService,
  textService,
  schedulerService,
  midiManager,
  mainWindow: () => mainWindow,
  audienceWindow: () => audienceWindow,
  confidenceWindow: () => confidenceWindow,
  lowerThirdsWindow: () => lowerThirdsWindow
});

// Create API for user scripts
const api: HarmonySyncAPI = scriptingAPI.createHarmonySyncAPI();
```

### API Domains

#### 🖥️ Display API
```typescript
// Show slide
await api.display.showSlide({
  type: 'text',
  content: 'Hello World!',
  background: '#000000'
});

// Show video
await api.display.showVideo('/path/to/video.mp4', { autoplay: true });

// Black screen
await api.display.blackScreen();

// Clear all
await api.display.clearAll();

// Update lower thirds
await api.display.updateLowerThirds('John Doe - Pastor');

// Send custom message
await api.display.sendToDisplay('audience', { type: 'custom', data: {} });
```

#### 🎵 Audio API
```typescript
// Convert to OGG
await api.audio.convertToOgg('/input.mp3', '/output/dir');

// Transpose
await api.audio.transpose('/input.mp3', '/output.mp3', 2);

// Get metadata
const metadata = await api.audio.getMetadata('/audio.mp3');
```

#### 🎬 Video API
```typescript
// Get metadata
const metadata = await api.video.getMetadata('/video.mp4');

// Generate thumbnail
await api.video.generateThumbnail('/video.mp4', '/thumb.jpg', { timestamp: 5 });
```

#### 🖼️ Image API
```typescript
// Get metadata
const metadata = await api.image.getMetadata('/image.jpg');

// Generate thumbnail
await api.image.generateThumbnail('/image.jpg', '/thumb.jpg', { width: 200 });

// Resize
await api.image.resize('/image.jpg', '/resized.jpg', { width: 1920, height: 1080 });
```

#### 📝 Text API
```typescript
// Generate gradient
const css = api.text.generateGradient({ colors: ['#ff0000', '#00ff00'] });

// Format lyrics
const formatted = api.text.formatLyrics(rawLyrics);

// Split into slides
const slides = api.text.splitLyrics(lyrics, { linesPerSlide: 4 });
```

#### 🪟 Window API
```typescript
// Show window
await api.window.show('audience');

// Hide window
await api.window.hide('confidence');

// Toggle window
await api.window.toggle('lowerThirds');

// Check visibility
if (api.window.isVisible('audience')) {
  console.log('Audience window is visible');
}
```

#### 🎹 MIDI API
```typescript
// Send note
await api.midi.sendNote(60, 127, 100);

// Send CC
await api.midi.sendCC(7, 100);
```

#### ⚡ Macro API
```typescript
// Execute macro
await api.macro.execute('macro-id', { param: 'value' });
```

#### 📅 Scheduler API
```typescript
// Get today's events
const events = await api.scheduler.getTodayEvents(db);

// Get upcoming events
const upcoming = await api.scheduler.getUpcomingEvents(db, 24);
```

#### 🛠️ Utils API
```typescript
// Wait
await api.utils.wait(1000);

// Get timestamp
const now = api.utils.now();

// Format date
const formatted = api.utils.formatDate(new Date());
```

#### 🐛 Debug API
```typescript
// Log
api.debug.log('Debug message', data);

// Inspect variable
api.debug.inspect(myObject, 'My Object');

// Timing
api.debug.time('operation');
// ... do something
api.debug.timeEnd('operation');

// Breakpoint
api.debug.breakpoint();
```

---

## 🎯 Example User Script

```typescript
// Example: Auto-advance slides every 5 seconds
async function autoAdvanceSlides(api: HarmonySyncAPI) {
  const slides = [
    { type: 'text', content: 'Slide 1' },
    { type: 'text', content: 'Slide 2' },
    { type: 'text', content: 'Slide 3' }
  ];
  
  for (const slide of slides) {
    await api.display.showSlide(slide);
    await api.utils.wait(5000);
  }
  
  await api.display.clearAll();
}

// Example: MIDI-triggered display
async function midiTrigger(api: HarmonySyncAPI) {
  // Send MIDI note to trigger lighting
  await api.midi.sendNote(60, 127, 100);
  
  // Show corresponding slide
  await api.display.showSlide({
    type: 'text',
    content: 'Triggered by MIDI!'
  });
}

// Example: Scheduled event automation
async function scheduledPlayback(api: HarmonySyncAPI, db: any) {
  const upcoming = await api.scheduler.getUpcomingEvents(db, 1);
  
  if (upcoming.length > 0) {
    const event = upcoming[0];
    api.debug.log('Upcoming event:', event);
    
    // Start preservice music 15 minutes before
    const minutesUntil = (event.startTime - api.utils.now()) / 60000;
    if (minutesUntil <= 15) {
      await api.audio.convertToOgg('/preservice.mp3', '/output');
    }
  }
}
```

---

## 🔒 Type Safety

All services are fully typed with:
- ✅ Interface definitions for all public APIs
- ✅ Type-safe service references
- ✅ Generic constraints where appropriate
- ✅ Proper null/undefined handling
- ✅ Type guards for runtime checks
- ✅ Comprehensive JSDoc documentation

---

## 📊 Service Comparison

| Service | Size (JS → TS) | Complexity | Key Feature |
|---------|----------------|------------|-------------|
| Audio Service | 8.3KB → 12.1KB | High | FFmpeg integration |
| MIDI Manager | 1.8KB → 9.4KB | Medium | Optional dependency |
| Scripting API | 14KB → 21.8KB | Very High | API orchestration |

---

## ✅ Best Practices

1. **Always initialize services before use:**
   ```typescript
   await service.initialize();
   ```

2. **Handle optional dependencies gracefully:**
   ```typescript
   if (midiManager.isMIDIAvailable()) {
     // Use MIDI features
   }
   ```

3. **Use progress callbacks for long operations:**
   ```typescript
   await audioService.convertToOgg(input, output, (progress) => {
     updateUI(progress.percent);
   });
   ```

4. **Clean up when done:**
   ```typescript
   service.dispose();
   ```

5. **Check initialization state:**
   ```typescript
   if (service.isInitialized()) {
     // Service is ready
   }
   ```

---

## 🚀 Next Steps

1. Update main process to use TypeScript services
2. Test audio conversion and transposition
3. Test MIDI with and without the package
4. Create sample user scripts
5. Update documentation with new API examples

---

**All 23 services are now TypeScript! 🎉**
