# HarmonySync Folder Service - Architecture

## Overview

The Folder Service is a standalone microservice that monitors a directory for zipped service packages and automatically processes them for use in the HarmonySync application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Folder Service                            │
│                                                              │
│  ┌──────────────┐      ┌─────────────┐     ┌─────────────┐ │
│  │              │      │             │     │             │ │
│  │  Chokidar    │─────▶│  Extractor  │────▶│   Parser    │ │
│  │  Watcher     │      │   (unzip)   │     │  (analyze)  │ │
│  │              │      │             │     │             │ │
│  └──────────────┘      └─────────────┘     └─────────────┘ │
│         │                                          │         │
│         │                                          │         │
│         ▼                                          ▼         │
│  ┌──────────────┐                         ┌─────────────┐  │
│  │              │                         │             │  │
│  │   Watch      │                         │  Service    │  │
│  │   Folder     │                         │  Storage    │  │
│  │              │                         │             │  │
│  └──────────────┘                         └─────────────┘  │
│                                                   │          │
│  ┌────────────────────────────────────────────────┼───────┐ │
│  │              API Layer                         │       │ │
│  │                                                │       │ │
│  │  ┌────────────┐        ┌─────────────────┐   │       │ │
│  │  │            │        │                 │   │       │ │
│  │  │  Express   │        │   Socket.IO     │───┘       │ │
│  │  │  REST API  │        │   (Real-time)   │           │ │
│  │  │            │        │                 │           │ │
│  │  └────────────┘        └─────────────────┘           │ │
│  │       │                         │                     │ │
│  └───────┼─────────────────────────┼─────────────────────┘ │
│          │                         │                       │
└──────────┼─────────────────────────┼───────────────────────┘
           │                         │
           ▼                         ▼
    ┌─────────────┐          ┌─────────────┐
    │             │          │             │
    │   HTTP      │          │  WebSocket  │
    │   Clients   │          │  Clients    │
    │             │          │             │
    └─────────────┘          └─────────────┘
           │                         │
           └───────────┬─────────────┘
                       ▼
              ┌─────────────────┐
              │                 │
              │  Electron App   │
              │  (Main Process) │
              │                 │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Service Order │
              │    ViewModel    │
              └─────────────────┘
```

## Components

### 1. File Watcher (Chokidar)

**Responsibility**: Monitor the watch folder for new zip files

**Technology**: chokidar (cross-platform file watching)

**Features**:
- Detects new files as they're added
- Waits for file write completion (stability threshold)
- Filters for .zip files only
- Prevents duplicate processing

**Configuration**:
```typescript
{
  ignored: /(^|[\/\\])\../,  // Ignore hidden files
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2s for file to stabilize
    pollInterval: 100
  }
}
```

### 2. Extractor

**Responsibility**: Unzip service packages

**Technology**: unzipper (streaming zip extraction)

**Process**:
1. Create unique extraction directory (UUID)
2. Stream zip contents to disk
3. Validate extraction success
4. Clean up on error

**Error Handling**:
- Validates zip integrity
- Cleans up partial extractions
- Reports errors to clients

### 3. Parser

**Responsibility**: Analyze folder structure and create service metadata

**Features**:
- Extracts sort order from folder names (e.g., "01 - Announcements")
- Cleans display names (removes numeric prefixes)
- Detects item types (song vs. folder)
  - Songs: contain audio files (.mp3, .wav, etc.)
  - Folders: everything else
- Sorts items by numeric order
- Handles nested structures

**Algorithm**:
```typescript
1. Scan extracted directory
2. For each folder:
   a. Extract sort number (regex: /^(\d+)\s*[-–—]\s*/)
   b. Clean name (remove prefix)
   c. Check for audio files
   d. Create ServiceItem
3. Sort items by sortOrder
4. Return sorted array
```

### 4. Service Storage

**Responsibility**: Manage extracted services in memory

**Data Structure**:
```typescript
Map<serviceId: string, ExtractedService>

interface ExtractedService {
  id: string;              // UUID
  name: string;            // Display name
  path: string;            // Extraction path
  items: ServiceItem[];    // Sorted service items
  extractedAt: Date;       // Timestamp
  sourceZip: string;       // Original zip path
}
```

**Operations**:
- Add new service
- Get service by ID
- List all services
- Delete service (removes files)
- Load existing services on startup

### 5. REST API (Express)

**Responsibility**: HTTP API for service management

**Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /config | Get configuration |
| POST | /config | Update configuration |
| GET | /services | List all services |
| GET | /services/:id | Get service details |
| POST | /import/:id | Import service |
| DELETE | /services/:id | Delete service |

**Features**:
- CORS enabled
- JSON request/response
- Request logging
- Error handling

### 6. Socket.IO Server

**Responsibility**: Real-time communication with clients

**Events Emitted**:
- `config-updated`: Configuration changed
- `service-detected`: New zip detected
- `service-extracted`: Extraction complete
- `service-import-request`: Ready to import
- `service-deleted`: Service removed
- `service-error`: Error occurred

**Events Received**:
- `configure`: Update config
- `import-service`: Request import

**Connection Handling**:
- Auto-reconnection
- State synchronization on connect
- Graceful disconnection

## Data Flow

### Service Import Flow

```
1. User drops zip file in watch folder
       ↓
2. Chokidar detects new file
       ↓
3. Watcher emits 'service-detected' event
       ↓
4. Extractor creates extraction directory
       ↓
5. Unzipper streams contents to disk
       ↓
6. Parser analyzes folder structure
       ↓
7. Service record created in storage
       ↓
8. Emits 'service-extracted' event
       ↓
9. Clients receive notification
       ↓
10. User requests import (or auto-import)
       ↓
11. Emits 'service-import-request'
       ↓
12. Electron app receives request
       ↓
13. ServiceOrderViewModel loads service
       ↓
14. UI updates with new service items
       ↓
15. (Optional) Delete original zip
```

### Configuration Update Flow

```
1. Client sends POST /config request
       ↓
2. Service validates new config
       ↓
3. Config saved to disk
       ↓
4. If watch folder changed:
   - Stop old watcher
   - Start new watcher
       ↓
5. Emit 'config-updated' to all clients
       ↓
6. Return success response
```

## Integration Points

### Electron App Integration

**Main Process**:
```typescript
import { FolderServiceClient } from '../folder-service/client';

// Initialize
const client = new FolderServiceClient();
await client.connect();

// Handle events
client.on('service-extracted', (service) => {
  // Notify renderer
  mainWindow.webContents.send('folder-service:extracted', service);
});

client.on('service-import-request', async (service) => {
  // Import to service order
  await importServiceToServiceOrder(service);
});

// Register IPC handlers
ipcMain.handle('folder-service:list', async () => {
  return await client.listServices();
});
```

**Renderer Process**:
```typescript
// Listen for service events
window.electron.on('folder-service:extracted', (service) => {
  // Show notification
  // Update service list
});

// Request import
await window.electron.invoke('folder-service:import', serviceId);
```

## Systemd Integration

**Service File**: `/etc/systemd/system/harmonysync-folder-service.service`

**Configuration**:
- Runs as user (not root)
- Auto-restart on failure
- Starts after network is available
- Logs to systemd journal

**Startup Sequence**:
```
1. System boot
   ↓
2. network.target reached
   ↓
3. systemd starts service
   ↓
4. Node.js process launches
   ↓
5. Service initializes
   ↓
6. Loads configuration
   ↓
7. Starts file watcher
   ↓
8. HTTP/Socket.IO server listens
   ↓
9. Service ready
```

## Error Handling

### File Watching Errors
- Log error
- Emit 'service-error' event
- Continue watching
- Don't crash service

### Extraction Errors
- Clean up partial extraction
- Emit 'service-error' with details
- Remove from processing queue
- Keep original zip (unless explicitly deleted)

### Configuration Errors
- Validate before applying
- Return 400 Bad Request
- Keep existing configuration
- Log error

### Network Errors
- Socket.IO auto-reconnects
- HTTP requests timeout after 10s
- Retry logic in client

## Performance Considerations

### Memory Management
- Services stored in memory (Map)
- Limit: ~1000 services max
- Consider implementing LRU cache for very large deployments

### File I/O
- Streaming extraction (low memory)
- Async file operations
- Parallel processing avoided (sequential queue)

### Network
- Socket.IO connection pooling
- HTTP keepalive
- JSON compression for large payloads

## Security Considerations

### File System Access
- Only accesses configured directories
- Validates paths to prevent directory traversal
- Uses UUID for extraction directories (unpredictable)

### API Access
- Runs on localhost only (127.0.0.1)
- No authentication (assumes trusted local environment)
- CORS enabled (localhost only in production)

### Service Permissions
- Runs as regular user (not root)
- Limited file system access
- No privileged operations

## Monitoring & Debugging

### Logs
- Systemd journal: `journalctl -u harmonysync-folder-service -f`
- Console output: timestamps, log levels
- Structured logging format

### Health Checks
- `/health` endpoint
- Returns service status
- Includes watching state
- Service count

### Metrics
- Services extracted: counter
- Errors: counter by type
- Active connections: gauge
- Processing queue size: gauge

## Future Enhancements

### Planned Features
1. Multiple watch folders
2. Service templates
3. Automatic backup before import
4. Service validation rules
5. Webhook notifications
6. Database persistence
7. Service versioning
8. Scheduled imports

### Scalability
- Horizontal: multiple instances with load balancer
- Vertical: increase memory/CPU
- Distributed: Redis for shared state
- Cloud: S3 for service storage

## Dependencies

### Core
- **express**: HTTP server
- **socket.io**: Real-time communication
- **chokidar**: File watching
- **unzipper**: Zip extraction
- **fs-extra**: Enhanced file system operations

### Development
- **typescript**: Type safety
- **nodemon**: Development auto-reload
- **jest**: Testing framework

## Testing Strategy

### Unit Tests
- Parser logic
- Sort order extraction
- Name cleaning
- Type detection

### Integration Tests
- File extraction
- API endpoints
- Socket.IO events
- Configuration updates

### End-to-End Tests
1. Create test zip
2. Place in watch folder
3. Verify extraction
4. Check service list
5. Request import
6. Verify service order updated

## Maintenance

### Regular Tasks
- Monitor log size
- Clean old extracted services
- Update dependencies
- Review error logs

### Backup Strategy
- Configuration: backed up automatically
- Extracted services: can be re-extracted from originals
- No critical data loss risk

### Update Procedure
```bash
1. Stop service
2. Pull updates
3. Install dependencies
4. Build TypeScript
5. Restart service
6. Verify health
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-02  
**Maintainer**: HarmonySync Team
