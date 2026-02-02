# TypeScript Media Services - Quick Reference

**Status:** ✅ Complete | **Date:** January 27, 2025

## Services Overview

| Service | Purpose | Lines | Public Methods |
|---------|---------|-------|----------------|
| **FFmpegService** | Audio/Video processing | 406 | 6 |
| **VideoService** | Video operations | 366 | 7 |
| **ImageService** | Image manipulation | 514 | 10 |
| **TextService** | Text & CSS generation | 460 | 11 |

---

## Quick Usage

### 1. FFmpegService

```typescript
import { getFFmpegService } from './services/ffmpeg';

const ffmpeg = getFFmpegService();
await ffmpeg.initialize();

// Convert audio to Ogg
const oggPath = await ffmpeg.convertToOgg(
  '/path/to/audio.mp3',
  '/output/dir',
  (progress) => console.log(`${progress}%`)
);

// Transpose audio by semitones
const result = await ffmpeg.transposeAudio('/song/path', 2);

// Get video metadata
const metadata = await ffmpeg.getVideoMetadata('/video.mp4');

// Transcode video
const transcodedPath = await ffmpeg.transcodeVideo('/video.mov');

// Generate thumbnail
const thumbPath = await ffmpeg.generateThumbnail('/video.mp4');

// Check audio sync
const syncResult = await ffmpeg.ensureAudioSync([
  '/track1.mp3', 
  '/track2.mp3'
]);
```

**Key Features:**
- Audio → Ogg conversion with progress
- Transpose with rhythm section preservation
- Video transcoding to H.264/AAC
- FFprobe metadata extraction

---

### 2. VideoService

```typescript
import { getVideoService } from './services/video-service';

const videoService = getVideoService();
await videoService.initialize();

// Get comprehensive metadata
const metadata = await videoService.getVideoMetadata('/video.mp4');

// Transcode with caching
const transcoded = await videoService.transcodeVideo(
  '/input.mov',
  (progress) => console.log(`${progress}%`)
);

// Generate thumbnail
const thumb = await videoService.generateThumbnail(
  '/video.mp4',
  3,        // timestamp in seconds
  '320x240' // size
);

// Extract frames
const frames = await videoService.extractFrames('/video.mp4', 5);

// Get duration
const duration = await videoService.getVideoDuration('/video.mp4');

// Check if needs transcoding
const needsTranscode = await videoService.needsTranscoding('/video.mp4');

// Optimize for web
const optimized = await videoService.optimizeForStreaming('/video.mp4');
```

**Key Features:**
- Smart caching (checks if file exists)
- H.264/AAC compatibility checking
- Frame extraction at intervals
- Web streaming optimization

---

### 3. ImageService

```typescript
import { getImageService, SUPPORTED_FORMATS } from './services/image-service';

const imageService = getImageService();
await imageService.initialize();

// Check if supported
if (imageService.isSupportedImage('/photo.jpg')) {
  // Get metadata
  const metadata = await imageService.getImageMetadata('/photo.jpg');
  
  // Generate thumbnail
  const thumb = await imageService.generateThumbnail('/photo.jpg', 320, 240);
  
  // Convert format
  const webp = await imageService.convertFormat(
    '/photo.jpg',
    'webp',
    { quality: 80, lossless: false }
  );
  
  // Resize image
  const resized = await imageService.resizeImage(
    '/photo.jpg',
    1920,
    1080,
    { fit: 'cover', position: 'center' }
  );
  
  // Optimize for web
  const optimized = await imageService.optimizeForWeb('/photo.jpg');
  
  // Add text overlay
  const withText = await imageService.addTextOverlay(
    '/photo.jpg',
    'Hello World',
    { fontSize: 48, color: 'white', stroke: 'black' }
  );
  
  // Get dominant color
  const color = await imageService.getDominantColor('/photo.jpg');
  
  // Clear old cache
  const deleted = await imageService.clearCache(7); // 7 days
}
```

**Key Features:**
- Sharp-based processing
- Multiple format support (JPEG, PNG, WebP, TIFF)
- Text overlay with SVG rendering
- Dominant color extraction
- Cache management

---

### 4. TextService

```typescript
import { getTextService } from './services/text-service';

const textService = getTextService();
await textService.initialize();

// Generate animated CSS
const css = textService.generateBackgroundCSS({
  color1: { r: 100, g: 150, b: 200 },
  color2: { r: 200, g: 100, b: 150 },
  animationDuration: 15,
  angle: -45
});

// Write CSS to file
await textService.writeBackgroundCSS('/output/dir', css);

// Or generate and save in one call
const savedCss = await textService.generateAndSaveCSS('/output/dir', {
  animationDuration: 20
});

// Format lyrics
const formatted = textService.formatLyrics(rawLyrics);

// Split into slides
const slides = textService.splitLyricsIntoSlides(formatted, 4);
// Returns: [{ section: 'Verse 1', lines: [...], text: '...' }, ...]

// Generate HTML
const html = textService.generateSlideHTML(
  'Line 1\nLine 2',
  { fontSize: '48px', color: '#ffffff' }
);

// Escape HTML
const safe = textService.escapeHtml('<script>alert("xss")</script>');

// Word wrap
const wrapped = textService.wordWrap(longText, 80);

// Get statistics
const stats = textService.getTextStats(text);
// Returns: { characters: 1234, words: 234, lines: 45, paragraphs: 12 }
```

**Key Features:**
- Animated gradient CSS generation
- Lyrics processing with section detection
- HTML generation with styling
- Text statistics and analysis

---

## Common Patterns

### Initialization

```typescript
// All services follow this pattern
const service = getServiceName(); // Singleton factory
await service.initialize();       // Must initialize before use

// Use service
await service.doSomething();

// Clean up when done
service.dispose();
```

### Error Handling

```typescript
try {
  const result = await service.someMethod(params);
} catch (error) {
  // Errors are properly typed and logged
  console.error('Operation failed:', error.message);
}
```

### Progress Callbacks

```typescript
// FFmpeg and Video services support progress callbacks
await ffmpeg.convertToOgg(
  inputPath,
  outputDir,
  (percent: number) => {
    console.log(`Progress: ${percent}%`);
    updateUI(percent);
  }
);
```

---

## Type Definitions

### FFmpegService Types

```typescript
interface AudioTransposeResult {
  outputDir: string;
  tracks: TransposedTrack[];
}

interface TransposedTrack {
  name: string;
  filePath: string;
}

interface AudioSyncResult {
  synced: boolean;
  message: string;
}
```

### ImageService Types

```typescript
interface ResizeOptions {
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: { r: number; g: number; b: number; alpha: number };
}

interface FormatConversionOptions {
  quality?: number;
  progressive?: boolean;
  compressionLevel?: number;
  lossless?: boolean;
}

interface TextOverlayOptions {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  top?: number;
  left?: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}
```

### TextService Types

```typescript
interface BackgroundCSSOptions {
  color1?: RGBColor;
  color2?: RGBColor;
  color3?: RGBColor;
  animationDuration?: number;
  angle?: number;
}

interface LyricsSlide {
  section: string | null;
  lines: string[];
  text: string;
}

interface TextStatistics {
  characters: number;
  words: number;
  lines: number;
  paragraphs: number;
}
```

---

## Service Comparison

### When to Use Which Service?

| Need | Use Service | Method |
|------|-------------|--------|
| Convert audio to Ogg | FFmpegService | `convertToOgg()` |
| Transpose song | FFmpegService | `transposeAudio()` |
| Video metadata | FFmpegService or VideoService | `getVideoMetadata()` |
| Transcode video | FFmpegService or VideoService | `transcodeVideo()` |
| Video thumbnail | FFmpegService or VideoService | `generateThumbnail()` |
| Extract video frames | VideoService | `extractFrames()` |
| Check video compatibility | VideoService | `needsTranscoding()` |
| Image thumbnail | ImageService | `generateThumbnail()` |
| Convert image format | ImageService | `convertFormat()` |
| Resize image | ImageService | `resizeImage()` |
| Add text to image | ImageService | `addTextOverlay()` |
| Get image color | ImageService | `getDominantColor()` |
| Generate CSS background | TextService | `generateBackgroundCSS()` |
| Process lyrics | TextService | `formatLyrics()` + `splitLyricsIntoSlides()` |
| Generate slide HTML | TextService | `generateSlideHTML()` |
| Text statistics | TextService | `getTextStats()` |

---

## Configuration

### Service Config Options

```typescript
interface ServiceConfig {
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  [key: string]: any;
}

// Example
const service = getFFmpegService({
  logLevel: 'debug',
  enabled: true
});
```

---

## File Locations

```
electron/
├── services/
│   ├── ffmpeg.ts              (406 lines) ✅
│   ├── video-service.ts       (366 lines) ✅
│   ├── image-service.ts       (514 lines) ✅
│   └── text-service.ts        (460 lines) ✅
└── types/
    ├── services.ts            (BaseElectronService, interfaces)
    └── models.ts              (shared type definitions)
```

---

## Constants

### Image Service

```typescript
SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg']
```

### FFmpeg Service

```typescript
// Rhythm section names (won't be transposed)
private rhythmSectionNames = ['guide', 'click', 'drums', 'percussion', 'shakers']

// Supported audio extensions
private audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac']
```

---

## Best Practices

### ✅ DO

```typescript
// Initialize before use
const service = getFFmpegService();
await service.initialize();

// Use try-catch for error handling
try {
  const result = await service.convertToOgg(input, output);
} catch (error) {
  console.error('Conversion failed:', error);
}

// Dispose when done
service.dispose();
```

### ❌ DON'T

```typescript
// Don't use without initialization
const service = getFFmpegService();
await service.convertToOgg(input, output); // May fail!

// Don't ignore errors
await service.convertToOgg(input, output); // No error handling

// Don't create multiple instances
const service1 = new FFmpegService(); // Use factory instead!
const service2 = new FFmpegService();
```

---

## Troubleshooting

### Service Not Initialized
```typescript
// Error: FFmpegService is not initialized
// Solution: Call initialize() first
const service = getFFmpegService();
await service.initialize(); // ← Add this
```

### Progress Callback Not Working
```typescript
// Make sure to pass a function
await ffmpeg.convertToOgg(
  input,
  output,
  (percent) => console.log(percent) // ← Must be a function
);
```

### Cache Directory Issues
```typescript
// Services automatically create cache directories
// Location: app.getPath('userData')/harmonysync/cache/
// To clear: await service.clearCache(7)
```

---

## Performance Tips

1. **Use Caching**
   - VideoService checks for existing transcoded files
   - ImageService has built-in cache management

2. **Batch Operations**
   - Process multiple files in sequence
   - Use progress callbacks for UI updates

3. **Optimize Images**
   - Use `optimizeForWeb()` for large images
   - Generate thumbnails for previews

4. **Clean Cache**
   - Periodically call `clearCache()` on ImageService
   - Default: 7 days retention

---

## Migration Guide

### From JavaScript

**Before:**
```javascript
const ffmpeg = require('./services/ffmpeg');
const result = await ffmpeg.convertToOgg(input, output);
```

**After:**
```typescript
import { getFFmpegService } from './services/ffmpeg';
const ffmpeg = getFFmpegService();
await ffmpeg.initialize();
const result = await ffmpeg.convertToOgg(input, output);
```

### Key Changes

1. **ES6 Imports** instead of CommonJS require
2. **Factory Functions** instead of direct module exports
3. **Initialization** required before use
4. **Type Safety** with full IntelliSense support

---

## Support

- **Full Documentation:** `TYPESCRIPT_MEDIA_SERVICES_COMPLETE.md`
- **Type Definitions:** `electron/types/services.ts`
- **Base Class:** `BaseElectronService` in `electron/types/services.ts`

---

**Quick Reference Version:** 1.0  
**Last Updated:** January 27, 2025  
**Status:** ✅ Production Ready
