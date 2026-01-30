# HarmonySync Video Service

Standalone Node.js video processing service for HarmonySync. Handles CPU and memory-intensive video operations without blocking the main Electron process.

**Note:** This service has been converted to TypeScript. See the build instructions below.

## Features

- Video transcoding and format conversion
- Thumbnail generation
- Video metadata extraction
- Progress tracking via Socket.io
- Memory-efficient streaming processing

## Development

### Prerequisites
- Node.js >= 16.0.0
- TypeScript 5.3+
- FFmpeg (for video processing)

### Build
```bash
cd harmonysync-video-service
npm install
npm run build
```

## Environment Variables

- `HOST` (optional) - Network interface to bind to (default: `127.0.0.1`)
- `PORT` (optional) - Port to listen on (default: `3002`)
- `SHUTDOWN_TOKEN` (optional but recommended) - Token for secure shutdown

## Quick Start

Build and start the service:

```bash
cd harmonysync-video-service
npm install
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Run smoke tests:

```bash
npm run smoke-test
```

With custom configuration:

```bash
export SHUTDOWN_TOKEN="mysecret"
export HOST=127.0.0.1
export PORT=3002
npm start
```

## Endpoints

### REST API
- `GET /api/health` - Health check
- `POST /api/shutdown` - Gracefully shutdown service (requires token)
- `GET /api/jobs/:id` - Get job status
- `DELETE /api/jobs/:id` - Cancel job

### Socket.io Events
- `video:transcode` - Request video transcoding
- `video:thumbnail` - Generate thumbnail
- `video:metadata` - Extract video metadata
- `job:progress` - Progress updates
- `job:complete` - Job completion notification
- `job:error` - Job error notification

## Notes

- Always set `SHUTDOWN_TOKEN` for production
- Service is designed to run on localhost only
- The Electron app automatically manages the service lifecycle
