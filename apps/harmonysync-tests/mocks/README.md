# Shared Mocks

This directory contains shared mock implementations for testing HarmonySync services.

## Overview

The mocks provide realistic, testable implementations of complex dependencies like audio processing, video transcoding, and image manipulation. They're designed to be reusable across all test suites.

## Available Mocks

### Audio Service Mocks

Located in [`audio-service.ts`](./audio-service.ts)

- **MockAudioTrack** - Mock audio track with playback control
- **MockAudioMixer** - Full-featured mixer with tracks, songs, and crossfading
- **MockAudic** - Mock audio player (Audic library)
- **createMockSocketServer()** - Factory for Socket.IO server mocks
- **createMockSocketClient()** - Factory for Socket.IO client mocks

#### Example Usage

```typescript
import { MockAudioMixer, MockAudioTrack } from '@harmonysync-tests/mocks';

const mixer = new MockAudioMixer();
const trackId = await mixer.loadTrack('/path/to/audio.mp3', 'My Track');
await mixer.playTrack(trackId);
mixer.setTrackVolume(trackId, 0.5);
```

### Video Service Mocks

Located in [`video-service.ts`](./video-service.ts)

- **MockFFmpeg** - Mock FFmpeg with ffprobe support
- **MockFFmpegCommand** - Chainable FFmpeg command builder with progress events
- **MockVideoJobManager** - Job queue manager for video operations
- **mockVideoUtils** - Utility functions for video processing
- **createMockVideoService()** - Complete video service factory

#### Example Usage

```typescript
import { MockFFmpeg, MockVideoJobManager } from '@harmonysync-tests/mocks';

const metadata = await MockFFmpeg.ffprobe('/path/to/video.mp4');

const jobManager = new MockVideoJobManager();
const jobId = jobManager.createJob('transcode', '/input.mp4', '/output.mp4');
await jobManager.startJob(jobId);
```

### Image Service Mocks

Located in [`image-service.ts`](./image-service.ts)

- **MockSharp** - Mock Sharp image processing library
- **MockImageJobManager** - Job queue for image operations
- **MockImageCache** - LRU cache for processed images
- **mockImageUtils** - Utility functions for image processing
- **MockPPTXConverter** - PPTX to images converter
- **MockPDFConverter** - PDF to images converter
- **createMockImageService()** - Complete image service factory

#### Example Usage

```typescript
import { MockSharp, createMockImageService } from '@harmonysync-tests/mocks';

const sharp = new MockSharp('/path/to/image.png');
await sharp.resize(800, 600).toFile('/output.png');

const service = createMockImageService();
const thumbnail = await service.generateThumbnail('/image.png', 200, 200);
```

## Features

### Event Emitters

All mock services extend EventEmitter and emit appropriate events:

```typescript
mixer.on('track_loaded', ({ trackId, name }) => {
  console.log(`Track ${name} loaded with ID ${trackId}`);
});

jobManager.on('job_completed', ({ job }) => {
  console.log(`Job ${job.id} completed`);
});
```

### Progress Tracking

Video and image operations emit progress events:

```typescript
const command = new MockFFmpegCommand('/input.mp4');
command
  .on('progress', (progress) => {
    console.log(`Progress: ${progress.percent}%`);
  })
  .on('end', () => {
    console.log('Complete!');
  })
  .save('/output.mp4');
```

### Job Management

Track async operations with job managers:

```typescript
const jobManager = new MockVideoJobManager();
const jobId = jobManager.createJob('transcode', '/input.mp4');

jobManager.on('job_started', ({ job }) => {
  console.log('Job started:', job.id);
});

await jobManager.startJob(jobId);
const job = jobManager.getJob(jobId);
console.log('Status:', job.status); // 'completed'
```

### Caching

Image service includes LRU cache:

```typescript
const cache = new MockImageCache();
cache.set('thumbnail:image.png:200:200', '/cache/thumb.png', 50000);

const cached = cache.get('thumbnail:image.png:200:200');
if (cached) {
  console.log('Cache hit!');
}
```

## Testing Patterns

### Basic Mock Usage

```typescript
import { MockAudioMixer } from '@harmonysync-tests/mocks';

describe('Audio Service', () => {
  let mixer: MockAudioMixer;

  beforeEach(() => {
    mixer = new MockAudioMixer();
  });

  afterEach(() => {
    mixer.clearAllTracks();
  });

  test('should load track', async () => {
    const id = await mixer.loadTrack('/audio.mp3');
    expect(mixer.tracks.has(id)).toBe(true);
  });
});
```

### Socket.IO Testing

```typescript
import { createMockSocketServer, createMockSocketClient } from '@harmonysync-tests/mocks';

test('socket communication', () => {
  const server = createMockSocketServer();
  const client = createMockSocketClient();
  
  server._simulateConnection(client);
  
  client.on('event', (data) => {
    expect(data).toBeDefined();
  });
  
  server.emit('event', { message: 'hello' });
});
```

### Job Management Testing

```typescript
import { MockVideoJobManager } from '@harmonysync-tests/mocks';

test('job lifecycle', async () => {
  const manager = new MockVideoJobManager();
  const events: string[] = [];
  
  manager.on('job_created', () => events.push('created'));
  manager.on('job_completed', () => events.push('completed'));
  
  const jobId = manager.createJob('transcode', '/input.mp4');
  await manager.startJob(jobId);
  
  await new Promise(r => setTimeout(r, 150));
  
  expect(events).toEqual(['created', 'completed']);
});
```

## Examples

See the [`examples/`](../examples/) directory for complete test examples:

- [`audio-service-example.test.ts`](../examples/audio-service-example.test.ts) - Audio service testing patterns
- [`video-service-example.test.ts`](../examples/video-service-example.test.ts) - Video service testing patterns

## Integration with Shared Types

All mocks use types from `@harmonysync/core`:

```typescript
import type { AudioTrackState, MixerState } from '@harmonysync/core';
import { MockAudioMixer } from '@harmonysync-tests/mocks';

const mixer = new MockAudioMixer();
const state: MixerState = mixer.getState();
```

## Best Practices

1. **Always clean up** - Call `clear()` or `destroy()` in `afterEach`
2. **Use factories** - Prefer `createMockVideoService()` over manual setup
3. **Listen to events** - Test event emissions for comprehensive coverage
4. **Mock realistically** - Delays and async behavior mimic real services
5. **Check state** - Validate internal state after operations

## Contributing

When adding new mocks:

1. Follow existing patterns (EventEmitter, async operations)
2. Include TypeScript types from `@harmonysync/core`
3. Add test helper methods (prefixed with `_` for internal use)
4. Document with JSDoc comments
5. Add usage examples to this README
6. Export from [`index.ts`](./index.ts)
