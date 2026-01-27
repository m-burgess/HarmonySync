# HarmonySync Service Architecture

## Overview

HarmonySync uses a **hybrid service architecture** to prevent freezing the main Electron process during CPU and memory-intensive operations.

## Service Categories

### 1. Separate Process Services (CPU/Memory Intensive)

These services run as **independent Node.js processes** to handle intensive operations without blocking the main Electron UI:

#### Audio Service (`harmonysync-audio-service/`)
- **Port**: 3001
- **Purpose**: Multitrack audio playback and real-time mixing
- **CPU Intensive Operations**:
  - Simultaneous playback of multiple audio tracks
  - Real-time audio mixing and synchronization
  - Audio crossfading between songs
  - Memory-intensive buffer management for multiple tracks
- **Why Separate**: Playing multiple audio tracks simultaneously requires significant CPU for decoding, mixing, and synchronization. Running in-process would freeze the UI during playback.

#### Video Service (`harmonysync-video-service/`)
- **Port**: 3002
- **Purpose**: Video transcoding and processing
- **CPU Intensive Operations**:
  - Video format conversion and transcoding (H.264 encoding)
  - Thumbnail generation from video frames
  - Frame extraction for video analysis
  - Video optimization for streaming
- **Why Separate**: Video transcoding is extremely CPU intensive and can take minutes for large files. Running in-process would completely freeze the application.

#### Image Service (`harmonysync-image-service/`)
- **Port**: 3003
- **Purpose**: Image processing and batch operations
- **Memory Intensive Operations**:
  - Large image resizing (4K+ images)
  - Batch image processing
  - Format conversion for multiple images
  - Image optimization with Sharp
- **Why Separate**: Processing high-resolution images (especially in batches) requires significant memory allocation. Running in-process could cause memory pressure and UI freezing.

### 2. In-Process Services (Lightweight Operations)

These services run **within the Electron main process** for quick, non-blocking operations:

#### Audio Service (`electron/services/audio-service.ts`)
- **Purpose**: Lightweight audio operations and metadata
- **Operations**:
  - Audio metadata extraction (duration, codec, sample rate)
  - Format detection
  - Audio file validation
  - Simple format conversions (to Ogg)
  - Audio transposition (creates new files asynchronously without blocking)
- **Why In-Process**: These are quick operations (< 1 second) that don't justify the overhead of inter-process communication.

#### Video Service (`electron/services/video-service.ts`)
- **Purpose**: Video metadata and validation
- **Operations**:
  - Video metadata extraction (dimensions, duration, codec)
  - Format detection and validation
  - Quick compatibility checks
- **Why In-Process**: Metadata extraction is fast (< 500ms) and needed frequently for UI decisions.

#### Image Service (`electron/services/image-service.ts`)
- **Purpose**: Image metadata and simple operations
- **Operations**:
  - Image metadata extraction (dimensions, format, size)
  - Format validation
  - Dominant color extraction
  - Small thumbnail generation (< 1MB images)
  - Image caching
- **Why In-Process**: Metadata operations are instant and needed for UI rendering decisions.

#### Slides Service (`electron/services/slides-service.ts`)
- **Purpose**: Slide import and management
- **Operations**:
  - PDF slide import (delegates to image service for rendering)
  - PowerPoint import (converts via LibreOffice, then uses image service)
  - Slide metadata management
  - Text slide creation
- **Why In-Process**: Coordinates with other services but doesn't do heavy lifting itself.

#### Display Service (`electron/services/display-service.ts`)
- **Purpose**: Window and display coordination
- **Operations**:
  - Send content to audience/confidence/lower-thirds windows
  - Coordinate which content goes to which display
  - IPC message routing
- **Why In-Process**: Routes messages between windows with no computation required.

#### Text Service (`electron/services/text-service.ts`)
- **Purpose**: Text and CSS generation
- **Operations**:
  - Generate HTML/CSS for lyrics and text slides
  - Format lyrics into slide sections
  - Create background CSS animations
  - Text wrapping and formatting
- **Why In-Process**: String manipulation only, extremely lightweight.

## Communication Patterns

### Separate Services → Electron
- **Protocol**: HTTP REST + Socket.io
- **Clients**: 
  - Frontend: `harmonysync/src/utils/*-client.ts`
  - Backend: Could use same clients or direct HTTP/socket calls
- **Events**: Real-time progress updates via Socket.io

### In-Process Services → IPC
- **Protocol**: Electron IPC (ipcMain/ipcRenderer)
- **Handlers**: `electron/ipc-handlers.ts`
- **Pattern**: Direct function calls, synchronous or promise-based

## Performance Considerations

### When to Use Separate Services
Use separate service processes when operations:
- Take > 1 second to complete
- Use significant CPU (> 20% for > 1 second)
- Allocate large memory (> 100MB)
- Process multiple files in batch
- Run continuously (like audio playback)

### When to Keep In-Process
Keep operations in-process when:
- Completing in < 500ms
- Using minimal CPU (< 10%)
- Small memory footprint (< 10MB)
- Needed for immediate UI feedback
- Called frequently (reduce IPC overhead)

## Service Lifecycle

### Separate Services
- **Started**: Automatically by Electron on app launch (`electron/main.ts`)
- **Shutdown**: Automatically on app quit
- **Health Checks**: HTTP `/api/health` endpoint
- **Security**: Shutdown token for secure termination

### In-Process Services
- **Started**: Imported and initialized in `electron/main.ts`
- **Lifecycle**: Tied to Electron main process
- **Cleanup**: Handled by service `dispose()` methods

## Future Improvements

1. **Connection Pool**: Reuse HTTP connections for in-process → separate service calls
2. **Service Discovery**: Auto-detect available service ports
3. **Graceful Degradation**: Fall back to in-process if separate service unavailable
4. **Load Balancing**: Multiple instances of separate services for heavy workloads

## Testing Strategy

### Separate Services
- **Unit Tests**: Test service endpoints independently
- **Integration Tests**: Test with sample audio/video/image files
- **Performance Tests**: Measure CPU/memory under load
- **Located**: Each service has its own test suite

### In-Process Services
- **Unit Tests**: Mock IPC and file system
- **Integration Tests**: Test with Electron test environment
- **Located**: `electron/services/__tests__/`

## Monitoring

### Metrics to Track
- Separate service response times
- Memory usage of separate processes
- CPU usage during intensive operations
- IPC message frequency and latency
- Service restart frequency

### Logging
- **Separate Services**: Console logs captured in service process
- **In-Process Services**: Electron main process logs
- **Frontend**: Browser console logs

## Troubleshooting

### Separate Service Not Starting
1. Check port availability (3001, 3002, 3003)
2. Verify Node.js installation
3. Check service logs for errors
4. Ensure dependencies installed in service directories

### Performance Issues
1. Check if heavy operations running in-process (should be separate)
2. Monitor CPU/memory usage of separate services
3. Consider increasing MAX_CONCURRENT_JOBS for image service
4. Check for memory leaks in long-running services

### Communication Errors
1. Verify services are running (`curl http://localhost:3001/api/health`)
2. Check firewall settings for localhost
3. Verify Socket.io connections established
4. Check for IPC handler registration errors
