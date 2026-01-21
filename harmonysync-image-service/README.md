# HarmonySync Image Service

Standalone Node.js image processing service for HarmonySync. Handles memory-intensive image operations without blocking the main Electron process.

## Features

- Image resizing and optimization
- Format conversion (JPEG, PNG, WebP, TIFF, AVIF)
- Thumbnail generation
- Batch processing with queue management
- Progress tracking via Socket.io
- Memory-efficient streaming

## Environment Variables

- `HOST` (optional) - Network interface to bind to (default: `127.0.0.1`)
- `PORT` (optional) - Port to listen on (default: `3003`)
- `SHUTDOWN_TOKEN` (optional but recommended) - Token for secure shutdown
- `MAX_CONCURRENT_JOBS` (optional) - Maximum concurrent jobs (default: `3`)

## Quick Start

Install dependencies and start the service:

```bash
cd harmonysync-image-service
npm install
npm start
```

With custom configuration:

```bash
export SHUTDOWN_TOKEN="mysecret"
export HOST=127.0.0.1
export PORT=3003
export MAX_CONCURRENT_JOBS=5
npm start
```

## Endpoints

### REST API
- `GET /api/health` - Health check
- `POST /api/shutdown` - Gracefully shutdown service (requires token)
- `GET /api/jobs/:id` - Get job status
- `DELETE /api/jobs/:id` - Cancel job
- `GET /api/queue` - Get queue status

### Socket.io Events
- `image:resize` - Resize image
- `image:convert` - Convert image format
- `image:thumbnail` - Generate thumbnail
- `image:optimize` - Optimize for web
- `image:batch` - Process multiple images
- `job:progress` - Progress updates
- `job:complete` - Job completion notification
- `job:error` - Job error notification

## Notes

- Always set `SHUTDOWN_TOKEN` for production
- Service is designed to run on localhost only
- Jobs are automatically queued when max concurrent limit is reached
- Large images (>4K) are automatically handled with streaming
