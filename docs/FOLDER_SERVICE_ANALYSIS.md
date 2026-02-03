# HarmonySync Folder Service - Complete Analysis

## Overview
The Folder Service is a standalone microservice that automatically monitors a user-specified directory for zipped service packages and processes them for use in the HarmonySync application.

## Key Features

### 1. **Automatic Folder Monitoring**
- Uses **Chokidar** for cross-platform file watching
- Detects new .zip files as they're added to the watch folder
- Includes stability threshold (2-second wait) to ensure files are fully written
- Processes only .zip files, ignores other file types

### 2. **Automated Extraction & Processing**
- **Streaming Unzip**: Uses unzipper library for efficient extraction
- **Unique IDs**: Assigns UUID to each extracted service
- **Auto-Delete**: Optionally removes original zip after extraction
- **Error Handling**: Cleans up partial extractions on failure

### 3. **Smart Service Structure Parsing**
```
Service Structure Example:
Service Order [Date]/
├── 01 - Announcements/
├── 02 - Song 1/
├── 03 - 5 Minute Countdown/
├── 04 - Sermon/
└── 05 - Special Items/
```

**Parsing Algorithm**:
- Extracts numeric sort order from folder names (regex: `/^(\d+)\s*[-–—]\s*/`)
- Cleans names by removing numeric prefixes
- Auto-detects item types:
  - **Songs**: Folders containing audio files (.mp3, .wav, .ogg, .flac, .m4a, .aac)
  - **Folders**: Everything else (presentations, images, videos)
- Sorts items by numeric order (01, 02, 03, etc.)
- Handles nested folder structures

### 4. **Boot Startup (OS Integration)**
- **Linux/macOS**: Systemd service unit for automatic boot startup
- **Windows**: PowerShell scripts or Task Scheduler integration (can be added)
- **Configuration Path**: `~/.harmonysync/folder-service-config.json`

### 5. **Real-Time Communication**
- **REST API** (HTTP endpoints):
  - `GET /health` - Health check
  - `GET /config` - Get current configuration
  - `POST /config` - Update configuration
  - `GET /services` - List extracted services
  - `GET /services/:id` - Get service details
  - `POST /import/:id` - Import service to main app
  - `DELETE /services/:id` - Delete extracted service

- **WebSocket** (Socket.IO):
  - `service-detected` - New zip detected
  - `service-extracted` - Extraction complete
  - `service-import-request` - Ready to import
  - `service-error` - Processing error
  - `config-updated` - Configuration changed

## Configuration

**Default Config Location**: `~/.harmonysync/folder-service-config.json`

```json
{
  "watchFolder": "/path/to/watch",
  "extractFolder": "/home/user/.harmonysync/imported-services",
  "autoDelete": true,
  "port": 3005
}
```

## Current Implementation Details

### Service Architecture
```
┌─────────────────┐
│ Chokidar Watch  │ Monitors watch folder for .zip files
├─────────────────┤
│   Extractor     │ Unzips to UUID-named directory
├─────────────────┤
│     Parser      │ Analyzes folder structure
├─────────────────┤
│  Service Map    │ Stores in-memory Map<id, service>
├─────────────────┤
│   API Layer     │ HTTP REST + WebSocket
└─────────────────┘
```

### Data Flow
1. **User places zip file** in watch folder
2. **Chokidar detects** new file (after stability check)
3. **Service extracts** zip to `extractFolder/{uuid}/`
4. **Parser analyzes** folder structure and creates service metadata
5. **Service stored** in in-memory Map
6. **Events emitted** to connected clients via HTTP/WebSocket
7. **Electron app** receives notifications and can import service
8. **Original zip** deleted (if auto-delete enabled)

### Service Item Type Detection
```typescript
isSong = contains any of: ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac']
type = isSong ? 'song' : 'folder'
```

## Integration Points

### With Electron App
- Receives `service-extracted` events via WebSocket
- Imports services on demand via POST `/import/:id`
- Can configure watch folder via POST `/config`

### With External Tools
- REST API allows any tool to:
  - Check folder service health
  - Query available services
  - Trigger imports
  - Manage extracted services

## Key Files

- **server.ts** - Main service implementation
- **client.ts** - Example TypeScript client
- **test-client.ts** - Test/demo client
- **install-service.ts** - OS service installation helper
- **install-service.sh** - Systemd service unit creation (Linux)
- **uninstall-service.sh** - Service removal script

## Deployment

### Development
```bash
pnpm dev  # Runs with watch mode on TypeScript
```

### Production
```bash
pnpm build
node dist/server.js
```

### As Systemd Service (Linux)
```bash
sudo pnpm run install-service
# Creates /etc/systemd/system/harmonysync-folder.service
systemctl enable harmonysync-folder
systemctl start harmonysync-folder
```

## Potential Enhancements

### 1. **Windows Startup Integration**
- Add Task Scheduler registration
- Create Windows service wrapper using NSSM or similar
- Add `.bat` installation scripts

### 2. **Service Metadata Enhancement**
- Store extracted service metadata to persistent database (SQLite/JSON)
- Preserve service import history
- Track which services have been imported

### 3. **Advanced Validation**
- Validate zip structure before extraction
- Verify required folder exists (01 - Announcements, 02 - Song, etc.)
- Check for corrupted or incomplete zips
- Provide detailed validation error reports

### 4. **Batch Processing**
- Handle multiple zip files in queue
- Progress tracking for large extractions
- Batch import notifications

### 5. **Smart Item Detection**
- Detect PowerPoint presentations (.pptx)
- Identify video files (.mp4, .mov, .avi)
- Recognize image folders (.jpg, .png)
- Better type classification beyond just songs

### 6. **Error Recovery**
- Retry failed extractions
- Move failed zips to error folder
- Detailed error logs
- Automatic error cleanup

### 7. **Performance Optimization**
- Cache parsed service structures
- Lazy load large service items
- Stream large files instead of loading to memory

### 8. **Security**
- Validate zip file signatures
- Scan for dangerous/suspicious files
- Limit zip file size
- Rate limiting on API endpoints

### 9. **Monitoring & Logging**
- Structured logging (winston/pino)
- Service performance metrics
- Disk usage monitoring
- Detailed extraction logs

### 10. **Graceful Shutdown Enhancement**
Currently: Services shut down on SIGINT/SIGTERM

**Improvements**:
- Complete in-progress extractions before shutdown
- Flush pending imports
- Persist service list to disk
- Reload on restart
