# Folder Service Integration Architecture

## Complete Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. PREPARATION PHASE
   ├─ Volunteer/Admin creates service order zip file:
   │  ├─ 01 - Announcements/
   │  │  ├─ slides.pptx
   │  │  └─ image.jpg
   │  ├─ 02 - 5 Minute Countdown/
   │  │  └─ countdown.mp4
   │  ├─ 03 - Song 1/
   │  │  ├─ track.mp3
   │  │  ├─ lyrics.lrc
   │  │  └─ chord-chart.pdf
   │  ├─ 04 - Sermon/
   │  │  ├─ sermon.mp4
   │  │  └─ notes.txt
   │  └─ 05 - Special Item/
   │     └─ video.mp4
   │
   └─ File: "Service Order 2025-02-02.zip"

2. UPLOAD PHASE
   ├─ Volunteer saves zip to configured watch folder:
   │  └─ ~/Downloads/HarmonySync/ (or configured path)
   │
   └─ Folder Service detects file (via Chokidar watcher)

3. PROCESSING PHASE (Folder Service)
   ├─ Extract: Service Order 2025-02-02.zip
   │  └─ → ~/.harmonysync/imported-services/{UUID}/
   │
   ├─ Parse: Analyze folder structure
   │  ├─ Extract order from names: 01, 02, 03, 04, 05
   │  ├─ Detect types:
   │  │  ├─ 01 - Announcements → folder (has image)
   │  │  ├─ 02 - 5 Minute Countdown → folder (has video)
   │  │  ├─ 03 - Song 1 → song (has mp3)
   │  │  ├─ 04 - Sermon → folder (has video)
   │  │  └─ 05 - Special Item → folder (has video)
   │  │
   │  └─ Create metadata:
   │     ├─ id: "abc123def456..."
   │     ├─ name: "Service Order 2025-02-02"
   │     ├─ items: [
   │     │   { id: "001", name: "Announcements", type: "folder", sortOrder: 1 },
   │     │   { id: "002", name: "5 Minute Countdown", type: "folder", sortOrder: 2 },
   │     │   { id: "003", name: "Song 1", type: "song", sortOrder: 3 },
   │     │   { id: "004", name: "Sermon", type: "folder", sortOrder: 4 },
   │     │   { id: "005", name: "Special Item", type: "folder", sortOrder: 5 }
   │     │ ]
   │     └─ extractedAt: 2025-02-02T10:30:00Z
   │
   ├─ Store: In-memory Map<id, service>
   │  └─ Can be persisted to JSON manifest
   │
   └─ Clean: Delete original zip (if auto-delete enabled)

4. NOTIFICATION PHASE
   ├─ WebSocket Emit: "service-extracted"
   │  └─ → Connected Electron app receives notification
   │
   └─ REST API Ready:
      ├─ GET /services returns [service metadata]
      ├─ GET /services/{UUID} returns full details
      └─ POST /import/{UUID} triggers import

5. IMPORT PHASE (Electron App)
   ├─ Electron app receives "service-extracted" event
   │  └─ Offers to import the service
   │
   ├─ User clicks "Import Service"
   │  └─ Electron app calls: POST /import/{UUID}
   │
   ├─ Folder Service emits: "service-import-request"
   │  └─ Includes full service metadata
   │
   └─ Electron app receives metadata and:
      ├─ Creates Service Order (in-memory structure)
      ├─ Populates each item:
      │  ├─ 01 - Announcements
      │  │  └─ Load slides from disk
      │  ├─ 02 - 5 Minute Countdown
      │  │  └─ Link to countdown video
      │  ├─ 03 - Song 1
      │  │  ├─ Load audio track
      │  │  ├─ Load lyrics
      │  │  └─ Load chord chart
      │  ├─ 04 - Sermon
      │  │  ├─ Load sermon video
      │  │  └─ Load notes
      │  └─ 05 - Special Item
      │     └─ Link to video
      │
      └─ Service Order is ready for broadcast!


┌──────────────────────────────────────────────────────────────────────────┐
│                      TECHNICAL ARCHITECTURE                              │
└──────────────────────────────────────────────────────────────────────────┘

FOLDER SERVICE (Node.js Microservice - Port 3005)
│
├─ WATCHER SUBSYSTEM
│  ├─ Technology: Chokidar (cross-platform file watching)
│  ├─ Watches: ~/.harmonysync/watch/ (or configured path)
│  ├─ Detects: .zip files only
│  ├─ Stability: 2-second write-finish threshold
│  └─ Queue: Prevents duplicate processing
│
├─ EXTRACTOR SUBSYSTEM
│  ├─ Technology: Unzipper (streaming extraction)
│  ├─ Output: ~/.harmonysync/imported-services/{UUID}/
│  ├─ Process:
│  │  1. Create extraction directory
│  │  2. Stream zip to disk (no full memory load)
│  │  3. Validate success
│  │  4. Cleanup on error
│  └─ Special: Auto-delete original if configured
│
├─ PARSER SUBSYSTEM
│  ├─ Reads: Extracted folder structure
│  ├─ Analyzes:
│  │  ├─ Numeric prefixes: /^(\d+)\s*[-–—]\s*/
│  │  ├─ Audio detection: [.mp3, .wav, .ogg, .flac, .m4a, .aac]
│  │  ├─ Video detection: [.mp4, .mov, .avi] (can add)
│  │  └─ Image detection: [.jpg, .png, .gif] (can add)
│  ├─ Outputs: ServiceItem[] (sorted)
│  └─ Stores: ServiceMetadata in in-memory Map
│
├─ API SUBSYSTEM (Express.js)
│  ├─ REST Endpoints:
│  │  ├─ GET /health
│  │  ├─ GET /config
│  │  ├─ POST /config (configure watch folder)
│  │  ├─ GET /services (list all)
│  │  ├─ GET /services/:id (details)
│  │  ├─ POST /import/:id (trigger import)
│  │  └─ DELETE /services/:id (cleanup)
│  │
│  └─ WebSocket Events (Socket.IO):
│     ├─ Emit: service-detected, service-extracted
│     ├─ Emit: service-import-request
│     ├─ Emit: service-error
│     ├─ Listen: configure, import-service
│     └─ Broadcast: config-updated
│
├─ STORAGE SUBSYSTEM
│  ├─ In-Memory: Map<UUID, ExtractedService>
│  ├─ On-Disk: ~/.harmonysync/imported-services/{UUID}/
│  ├─ Config: ~/.harmonysync/folder-service-config.json
│  └─ Future: ~/.harmonysync/services-manifest.json (persistence)
│
└─ BOOT INTEGRATION
   ├─ Linux: systemd service unit
   ├─ Windows: (can add) Task Scheduler / NSSM
   ├─ macOS: (can add) launchd plist
   └─ Config: Auto-loads from ~/.harmonysync/
```

## Communication Flow

### 1. Folder Detection to Extraction

```
Watch Folder ──chokidar──> FileSystem Event
                              │
                              ▼
                        handleNewFile()
                              │
                              ├─ Check: .zip?
                              ├─ Check: Not processing?
                              ├─ Emit: "service-detected" (WebSocket)
                              │
                              ▼
                        extractAndProcess()
                              │
                              ├─ Create UUID
                              ├─ Create dir
                              ├─ Extract zip (stream)
                              ├─ Parse structure
                              ├─ Store in Map
                              ├─ Emit: "service-extracted" (WebSocket)
                              │
                              └─ Delete original? (auto-delete)
```

### 2. Electron App Integration

```
Electron App (Main Process)
    │
    ├─ Connect to Folder Service
    │  └─ WebSocket: io('http://127.0.0.1:3005')
    │
    ├─ Listen: 'service-extracted'
    │  └─ Show notification: "New service ready"
    │
    ├─ User clicks: "Import Service"
    │  │
    │  └─ Call: POST /import/{serviceId}
    │     │
    │     ├─ Folder Service emits: "service-import-request"
    │     │
    │     └─ Electron receives:
    │        ├─ Service metadata (structure, paths)
    │        ├─ Item list (names, types, sort order)
    │        └─ Folder paths (for loading media)
    │
    └─ Create Service Order ViewModel
       ├─ Map each item to proper view
       ├─ Link media (slides, videos, audio)
       ├─ Set sort order
       └─ Ready for broadcast!
```

## Data Structure Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Service Order 2025-02-02",
  "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Announcements",
      "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000/01 - Announcements",
      "type": "folder",
      "sortOrder": 1
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "5 Minute Countdown",
      "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000/02 - 5 Minute Countdown",
      "type": "folder",
      "sortOrder": 2
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Song 1",
      "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000/03 - Song 1",
      "type": "song",
      "sortOrder": 3
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "name": "Sermon",
      "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000/04 - Sermon",
      "type": "folder",
      "sortOrder": 4
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "name": "Special Item",
      "path": "/home/user/.harmonysync/imported-services/550e8400-e29b-41d4-a716-446655440000/05 - Special Item",
      "type": "folder",
      "sortOrder": 5
    }
  ],
  "extractedAt": "2025-02-02T10:30:00.000Z",
  "sourceZip": "/home/user/Downloads/Service Order 2025-02-02.zip"
}
```

## Key Configuration

```json
{
  "watchFolder": "/home/user/Downloads/HarmonySync",
  "extractFolder": "/home/user/.harmonysync/imported-services",
  "autoDelete": true,
  "port": 3005
}
```

**Configuration is stored at**: `~/.harmonysync/folder-service-config.json`

**Can be updated via**:
- `POST /config` endpoint
- WebSocket `configure` event
- Direct file edit (requires service restart)

## System Boot Integration

### Linux (systemd)

```bash
# Service runs automatically on boot
sudo systemctl enable harmonysync-folder-service
sudo systemctl start harmonysync-folder-service

# Check status
sudo systemctl status harmonysync-folder-service

# View logs
journalctl -u harmonysync-folder-service -f

# File location: /etc/systemd/system/harmonysync-folder-service
```

### Windows (Task Scheduler - Future)

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "C:\path\to\harmonysync-folder\node_modules\.bin\node.exe" `
  -Argument "dist/server.js"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "HarmonySync Folder Service" `
  -Action $action -Trigger $trigger -RunLevel Highest
```

### macOS (launchd - Future)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.harmonysync.folder-service</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/service/dist/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

## Error Scenarios

```
❌ SCENARIO 1: User drops zip in watch folder
   └─ Watch folder not configured
   └─ Error: Service warns "No watch folder configured"
   └─ Resolution: User configures folder via UI/API

❌ SCENARIO 2: Corrupted zip file
   └─ Unzipper fails to extract
   └─ Error: Logged with details
   └─ Recovery: Partial folder cleaned up
   └─ User: See error message, can retry or delete

❌ SCENARIO 3: Disk space full during extraction
   └─ Error during write
   └─ Recovery: Cleanup partial extraction
   └─ User: Gets error about disk space

❌ SCENARIO 4: Service stops unexpectedly
   └─ systemd restarts automatically
   └─ Watch folder reloads
   └─ Existing services re-indexed on startup

✅ HAPPY PATH: Service order ready to broadcast
   └─ User has volunteer-created service on disk
   └─ Folder service automatically processes it
   └─ Electron app imports and displays it
   └─ Volunteer can broadcast immediately!
```

## Performance Considerations

- **Extraction Speed**: Depends on zip size and disk speed
  - Typical 500MB service: ~5-10 seconds
  - Streaming extraction: Memory-efficient (doesn't load entire zip)

- **Parsing Speed**: File system scanning
  - Typical 5-20 items: <100ms
  - Recursive folder reading: <500ms for large structures

- **WebSocket Latency**: Real-time notifications
  - Service-detected event: ~100ms
  - Service-extracted event: After extraction complete

- **Storage**: Extracted services remain on disk
  - No automatic cleanup (unless auto-delete configured for zip)
  - Can delete via DELETE /services/:id endpoint

## Security Considerations

**Current**:
- ✅ Streaming extraction (not full memory)
- ✅ Auto-cleanup on error
- ✅ Only .zip files processed
- ❌ No zip validation (can add)
- ❌ No size limits (can add)
- ❌ No file signature check (can add)

**Future Enhancements**:
- Zip bomb detection (compression ratio check)
- Maximum size limits
- Suspicious file detection (.exe, .bat, etc.)
- Path traversal prevention
- Rate limiting on API
