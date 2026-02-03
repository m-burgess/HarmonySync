# Folder Service - Feature Development Guide

## Current Status
The Folder Service is fully functional and handles the core workflow:
1. ✅ Monitors watch folder for zip files
2. ✅ Extracts zips to unique directories
3. ✅ Parses folder structure and detects item types
4. ✅ Provides REST API and WebSocket communication
5. ✅ Boots with OS (Linux systemd)
6. ✅ Auto-deletes original zips

## Identified Shutdown Issue

**Problem**: The folder service is exiting gracefully even when the watch folder is not configured.

**Location**: `server.ts`, line 527 in the `initializeService()` method

**Current Code**:
```typescript
if (this.config.watchFolder) {
  this.startWatching();
} else {
  console.log('⚠️  No watch folder configured. Use POST /config to set one.');
}
```

**Issue**: The service should remain running to allow configuration of the watch folder via POST /config, but it may be exiting due to the watcher automatically shutting down.

**Solution**: The service is actually working correctly - it stays running but doesn't watch until configured. The early shutdown we observed in dev mode was from the `pnpm run dev` command being interrupted, not from the folder service itself.

## Recommended Feature Enhancements

### Priority 1: Windows Service Integration

**Goal**: Allow the folder service to boot with Windows automatically

**Implementation**:
```typescript
// In install-service.ts, add platform detection

if (process.platform === 'win32') {
  // Use Task Scheduler or NSSM
} else if (process.platform === 'linux') {
  // Use systemd
} else if (process.platform === 'darwin') {
  // Use launchd
}
```

**Files to Create**:
- `install-service-windows.ts` - Windows-specific installation
- `install-service-macos.ts` - macOS launchd installation
- `install-service-linux.ts` - Linux systemd installation

---

### Priority 2: Persistent Service Metadata

**Goal**: Remember extracted services across restarts

**Current Limitation**: Services are stored only in memory (`Map<id, service>`)

**Implementation**:
```typescript
interface PersistentServiceStore {
  services: ExtractedService[];
  lastUpdated: Date;
  version: string;
}

// Save to: ~/.harmonysync/services-manifest.json
```

**Benefits**:
- Services persist after restart
- Can display available services without re-extraction
- Track service import history

**Files to Modify**:
- `server.ts` - Add `saveServices()` and `loadServices()` methods
- Create new `persistence-manager.ts` for JSON storage

---

### Priority 3: Advanced Validation

**Goal**: Catch zip/folder issues before extraction

**Validations to Add**:
```typescript
validateServiceZip(zipPath): ValidationResult {
  // 1. Check minimum folder count (should have at least 2-3 main folders)
  // 2. Verify at least one folder starts with "01 -"
  // 3. Check for suspicious files (.exe, .bat, .ps1 on Windows)
  // 4. Validate total size limits
  // 5. Ensure no nested zips (zip bombs)
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    estimatedItems: number;
    totalSize: number;
    hasAudio: boolean;
    hasVideo: boolean;
  }
}
```

**Implementation Location**: Create `validator.ts`

---

### Priority 4: Smart Item Type Detection

**Goal**: Better classify service items beyond just "song" vs "folder"

**Current Detection**:
```
- Song: contains .mp3, .wav, .ogg, etc.
- Folder: everything else
```

**Enhanced Detection**:
```typescript
enum ServiceItemType {
  Song = 'song',
  Presentation = 'presentation',
  Video = 'video',
  Image = 'image',
  Audio = 'audio',
  Lyrics = 'lyrics',
  Mixed = 'mixed'
}

detectItemType(folderPath): ServiceItemType {
  // Check for:
  // - *.pptx, *.odp → Presentation
  // - *.mp4, *.mov, *.webm → Video
  // - *.jpg, *.png, *.gif → Image
  // - *.mp3, *.wav → Audio
  // - *.lrc, *.txt (lyrics files) → Lyrics
  // - Multiple types → Mixed
}
```

**Implementation Location**: Extend `server.ts` parsing functions

---

### Priority 5: Detailed Error Handling

**Goal**: Provide actionable error messages

**Error Categories**:
```typescript
enum ServiceError {
  ZipCorrupted = 'ZIP_CORRUPTED',
  InvalidStructure = 'INVALID_STRUCTURE',
  DiskSpaceFull = 'DISK_SPACE_FULL',
  PermissionDenied = 'PERMISSION_DENIED',
  ExtractionFailed = 'EXTRACTION_FAILED',
  UnknownError = 'UNKNOWN_ERROR'
}

interface ServiceErrorReport {
  error: ServiceError;
  filePath: string;
  timestamp: Date;
  message: string;
  suggestion: string; // User-friendly recommendation
  details?: any;
}
```

**Implementation Location**: Create `error-handler.ts`

---

### Priority 6: Performance Optimization

**Goal**: Handle large service packages efficiently

**Optimizations**:

1. **Streaming Processing**:
```typescript
// Instead of loading entire zip, stream items
const zipStream = fs.createReadStream(zipPath)
  .pipe(unzipper.Parse())
  .on('entry', (entry) => {
    // Process entries as they stream
  })
```

2. **Lazy Loading**:
```typescript
// Don't load all service contents immediately
interface ServiceItem {
  // ... existing properties
  childrenLoaded: boolean;
  loadChildren(): Promise<ServiceItem[]>
}
```

3. **Caching**:
```typescript
// Cache parsed structures to avoid re-parsing
private parseCache: Map<string, ServiceItem[]>
```

---

### Priority 7: Batch Processing Queue

**Goal**: Handle multiple zip uploads gracefully

**Current Implementation**: Processes files one at a time sequentially

**Enhancement**:
```typescript
class ProcessingQueue {
  private queue: QueuedFile[] = [];
  private processing: boolean = false;
  private maxConcurrent: number = 3;

  async enqueue(filePath: string): Promise<void>
  private async processQueue(): Promise<void>
  getStatus(): QueueStatus
}

interface QueueStatus {
  total: number;
  processing: number;
  pending: number;
  completed: number;
  failed: number;
}
```

**API Addition**: `GET /status` returns queue status

---

### Priority 8: Security Enhancements

**Goal**: Validate and secure zip processing

**Measures**:

1. **File Size Limits**:
```typescript
const MAX_ZIP_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const MAX_EXTRACT_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
```

2. **Zip Bomb Detection**:
```typescript
validateZipIntegrity(zipPath): boolean {
  // Check compression ratio
  // If compressed size << extracted size, could be bomb
  const ratio = compressedSize / extractedSize;
  if (ratio < 0.01) {
    // Suspicious
    return false;
  }
}
```

3. **Path Traversal Prevention**:
```typescript
validateExtractPath(entryPath, basePath): boolean {
  const resolved = path.resolve(basePath, entryPath);
  return resolved.startsWith(basePath); // No ../ escapes
}
```

---

### Priority 9: Monitoring & Logging

**Goal**: Better visibility into service operations

**Structured Logging**:
```typescript
interface ServiceLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  action: string;
  duration?: number;
  metadata?: any;
}

// Use winston or pino for persistent logging
// Logs stored in: ~/.harmonysync/logs/folder-service.log
```

**Metrics to Track**:
- Files processed (count, size, time)
- Extraction success rate
- Average extraction time
- Error frequency by type
- Disk usage trends

---

### Priority 10: Configuration UI Integration

**Goal**: Provide UI for configuring folder service

**Electron App Integration**:
```typescript
// In electron-app, add endpoint:
// GET /api/folder-service/config
// POST /api/folder-service/config
// GET /api/folder-service/services
// POST /api/folder-service/import/:id

// Create settings panel in UI:
// - Configure watch folder (file picker)
// - Enable/disable auto-delete
// - View extracted services
// - Manual import options
// - Service deletion
```

---

## Implementation Roadmap

### Phase 1: Stability (Week 1-2)
- Fix graceful shutdown (if needed)
- Add comprehensive error handling
- Implement persistent service metadata
- Add detailed logging

### Phase 2: Validation (Week 3)
- Add zip validation before extraction
- Enhanced item type detection
- Detailed validation error reporting

### Phase 3: Performance (Week 4)
- Implement batch processing queue
- Add performance monitoring
- Optimize for large files

### Phase 4: Security (Week 5)
- Add security validations
- Implement rate limiting
- Add file signature verification

### Phase 5: Integration (Week 6-7)
- Windows/macOS service integration
- Electron app configuration UI
- Full E2E testing

### Phase 6: Polish (Week 8)
- Documentation updates
- User guide creation
- Performance tuning

---

## Testing Strategy

### Unit Tests
```typescript
// test/validator.test.ts
- validateServiceStructure()
- detectItemType()
- extractSortOrder()

// test/extractor.test.ts
- extractZip()
- cleanupOnError()
- detectZipBombs()
```

### Integration Tests
```typescript
// test/integration.test.ts
- Full zip → extraction → parsing workflow
- Configuration persistence
- WebSocket notifications
```

### End-to-End Tests
```typescript
// test/e2e.test.ts
- Create test zip files
- Upload to watch folder
- Verify parsing and storage
- Test Electron app integration
```

---

## API Expansion

### New Endpoints (Priority 2+)

```
POST /validate
- Validate zip without extracting
- Returns validation result

GET /status
- Returns queue status and metrics

POST /services/:id/validate
- Re-validate extracted service

GET /services/:id/tree
- Get full folder tree structure

POST /services/:id/move
- Move service to different folder

GET /metrics
- Service metrics and statistics
```

---

## Database Schema (When Implementing Persistence)

```typescript
interface ServiceManifest {
  id: string; // UUID
  name: string;
  path: string;
  status: 'extracted' | 'imported' | 'archived' | 'error';
  
  // Structure
  items: ServiceItem[];
  itemCount: number;
  
  // Metadata
  extractedAt: Date;
  importedAt?: Date;
  size: number;
  duration: number; // extraction time in ms
  
  // Source
  sourceZip: string;
  sourceSize: number;
  sourceHash?: string; // SHA256 for dedup
  
  // Status
  errors?: string[];
  warnings?: string[];
  lastValidated?: Date;
  
  // Analytics
  importCount: number;
  lastImportedAt?: Date;
}
```

---

## Configuration Enhancements

```json
{
  "watchFolder": "/path/to/watch",
  "extractFolder": "/path/to/extract",
  "autoDelete": true,
  "port": 3005,
  
  "validation": {
    "enabled": true,
    "maxZipSize": 5000000000,
    "maxExtractSize": 10000000000
  },
  
  "performance": {
    "maxConcurrentExtractions": 3,
    "enableCaching": true,
    "cacheTTL": 3600
  },
  
  "logging": {
    "level": "info",
    "format": "json",
    "retention": 30
  }
}
```

---

## Notes for Developer

- **Current Service**: Very solid foundation, handles core workflow well
- **Key Strength**: Clean separation of concerns (watcher, extractor, parser)
- **Main Limitation**: Everything in-memory only
- **Quick Wins**: Persistence, validation, logging (high impact, moderate effort)
- **Long-term**: Full production monitoring and analytics

**Recommendation**: Start with Priority 1 (Windows support) and Priority 2 (Persistence) as they have the highest user impact. Then move to Priority 3+ based on user feedback.
