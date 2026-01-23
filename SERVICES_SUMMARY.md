# Services Implementation Summary

This document describes all services implemented for better code maintainability.

## Services Overview

### Core Media Services (4 services)

1. **Video Service** (`electron/services/video-service.js`) - 9 functions
   - Video metadata, transcoding, thumbnails, frame extraction, streaming optimization

2. **YouTube Service** (`electron/services/youtube-service.js`) - 11 functions
   - YouTube-specific transcoding, validation, link management, URL parsing

3. **Image Service** (`electron/services/image-service.js`) - 11 functions
   - Image processing with Sharp, thumbnails, conversion, optimization, caching

4. **Text Service** (`electron/services/text-service.js`) - 14 functions
   - CSS generation, lyrics formatting, slide HTML generation, text statistics

### High Priority Services (3 services)

5. **Audio Service** (`electron/services/audio-service.js`) - 5 functions
   - Audio conversion, transposition, synchronization, metadata, normalization

6. **Display Service** (`electron/services/display-service.js`) - 7 functions
   - Window coordination, content display across multiple windows

7. **Window Service** (`electron/services/window-service.js`) - 15 functions
   - Window lifecycle management, show/hide, toggle, focus, status queries

### Medium Priority Services (2 services)

8. **Macro Service** (`electron/services/macro-service.js`) - 10 functions
   - Macro execution, CRUD operations, slide associations, validation

9. **Scheduler Service** (`electron/services/scheduler-service.js`) - 11 functions
   - Event scheduling, time-based queries, execution timing checks

### Cloud Storage Services (2 services)

10. **Google Drive Service** (`electron/services/google-drive.js`) - 5 functions
    - Google Drive authentication, file listing, downloading, folder syncing

11. **Dropbox Service** (`electron/services/dropbox-service.js`) - 5 functions
    - Dropbox authentication, file listing, downloading, folder syncing

## Total Implementation

- **11 services** with 103+ functions
- **90+ IPC handlers** (video, youtube, image, text, audio, display, window, macro, scheduler, gdrive, dropbox)
- **Full test coverage** with Jest framework
- **Comprehensive documentation**

## Architecture Benefits

1. **Separation of Concerns** - Each service handles specific functionality
2. **Maintainability** - Services can be updated independently
3. **Testability** - Each service can be tested in isolation
4. **Scalability** - Easy to add new services or extend existing ones
5. **Code Organization** - Clear structure and responsibility

## MIDI Approach for Lighting Control

**Decision**: Use MIDI to control external DMX lighting software rather than implementing direct DMX output.

**Rationale**:
- This app focuses on presentation, not lighting control
- External DMX software handles hardware drivers and interfaces
- MIDI Show Control (MSC) is industry standard for triggering lighting cues
- Simpler architecture with less maintenance burden
- More flexibility for users to choose their preferred DMX software

## Testing

Run tests with:
```bash
npm test              # Run all tests
npm run test:watch    # Run in watch mode
npm run test:coverage # Run with coverage
```

## Dependencies

- `fluent-ffmpeg` - Audio/video processing
- `sharp` - Image processing
- `googleapis` - Google Drive integration
- `dropbox` - Dropbox integration
- `fs-extra` - JSON file operations
- `jest` - Testing framework

---

*Last updated: January 20, 2026*
