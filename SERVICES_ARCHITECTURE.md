# Standalone Services Architecture

HarmonySync now uses three standalone Node.js services to isolate memory-intensive operations from the main Electron process.

## Services Overview

### 1. Audio Service (Port 3001)
**Location**: `harmonysync-audio-service/`
- **Purpose**: Multitrack audio playback and mixing
- **Features**: Real-time mixing, volume control, crossfading, synchronized playback
- **Memory Impact**: High (streaming multiple audio tracks)
- **Status**: ✅ Implemented

### 2. Video Service (Port 3002)
**Location**: `harmonysync-video-service/`
- **Purpose**: Video transcoding and processing
- **Features**: Format conversion, thumbnail generation, metadata extraction
- **Memory Impact**: Very High (500MB+ during transcoding)
- **CPU Impact**: Very High (blocks main thread)
- **Status**: ✅ Implemented

### 3. Image Service (Port 3003)
**Location**: `harmonysync-image-service/`
- **Purpose**: Image processing and optimization
- **Features**: Resizing, format conversion, thumbnails, batch processing, job queue
- **Memory Impact**: High (200-500MB for large images)
- **Queue**: Limits concurrent jobs to prevent memory spikes
- **Status**: ✅ Implemented

## Architecture Benefits

### Memory Isolation
- Heavy operations run in separate processes
- Main Electron process stays lightweight (<200MB)
- Service crashes don't affect the main app

### Performance
- No UI blocking during intensive operations
- Concurrent processing in separate processes
- Queue management prevents overload

### Scalability
- Services can be independently scaled
- Easy to add more worker processes
- Can run on different machines if needed

## Service Management

All services are automatically managed by Electron:

```javascript
app.whenReady().then(async () => {
  await startAudioService();   // Port 3001
  await startVideoService();   // Port 3002
  await startImageService();   // Port 3003
  // ... create windows
});

app.on('before-quit', async () => {
  await stopAudioService();
  await stopVideoService();
  await stopImageService();
});
```

## Client Usage

### Video Service
```javascript
import VideoServiceClient from './utils/video/video-service-client.js';

const videoClient = new VideoServiceClient();
await videoClient.connect();

// Transcode video with progress
const jobId = await videoClient.transcodeVideo('/path/to/video.mp4', {
  videoCodec: 'libx264',
  preset: 'fast',
  crf: 23
});

await videoClient.waitForJob(jobId, (progress) => {
  console.log(`Progress: ${progress}%`);
});
```

### Image Service
```javascript
import ImageServiceClient from './utils/image/image-service-client.js';

const imageClient = new ImageServiceClient();
await imageClient.connect();

// Batch process images
const jobId = await imageClient.processBatch(
  ['/path/to/img1.jpg', '/path/to/img2.png'],
  'optimize',
  { quality: 85, maxWidth: 1920 }
);

await imageClient.waitForJob(jobId, (progress, job) => {
  console.log(`Batch progress: ${progress}%`);
});
```

## Memory Comparison

### Before (All in Electron):
- Idle: ~300MB
- With video transcoding: ~800-1200MB
- With batch image processing: ~700-1000MB
- **Risk**: UI freezes, potential crashes

### After (Standalone Services):
- Main Electron Process: ~150-200MB (stable)
- Audio Service: ~60-100MB
- Video Service: ~100-600MB (during transcoding)
- Image Service: ~80-300MB (during processing)
- **Benefits**: UI responsive, isolated failures, better resource management

## Development

### Start Services Manually
```bash
# Audio Service
cd harmonysync-audio-service
npm start

# Video Service  
cd harmonysync-video-service
npm start

# Image Service
cd harmonysync-image-service
npm start
```

### Run Tests
```bash
npm test  # In each service directory
```

## Future Enhancements

Potential services to add:
- **Lyrics Service** - Web scraping and lyrics fetching (low priority)
- **Cloud Storage Service** - Large file uploads/downloads (medium priority)
- **Database Service** - If database operations become heavy (low priority)

## Configuration

Services use environment variables:
- `HOST` - Bind address (default: 127.0.0.1)
- `PORT` - Service port
- `SHUTDOWN_TOKEN` - Secure shutdown token
- Service-specific options (MAX_CONCURRENT_JOBS, etc.)

All services are configured to run on localhost only for security.
