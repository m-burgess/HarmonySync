# Folder Service - Code Reference Guide

## File Structure

```
apps/harmonysync-folder-service/
├── server.ts                  # Main service implementation (568 lines)
├── client.ts                  # Example TypeScript client
├── test-client.ts             # Test/demo client
├── install-service.ts         # OS service installation
├── install-service.sh         # Linux systemd setup
├── uninstall-service.sh       # Service removal
├── create-test-service.sh     # Test zip creation
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── README.md                  # User guide
├── USAGE.md                   # Feature guide
├── ARCHITECTURE.md            # Design documentation
├── INSTALLATION.md            # Setup guide
├── openapi.yml                # API specification
├── dist/                      # Compiled JavaScript
├── node_modules/              # Dependencies
└── integration-example.ts     # Integration example
```

---

## Key Code Sections

### server.ts - Main Service Implementation

#### Configuration Management (Lines 1-50)
```typescript
// PORT, HOST, CONFIG_DIR, CONFIG_PATH setup
const PORT: number = parseInt(process.env.PORT || '3005', 10);
const CONFIG_PATH: string = path.join(CONFIG_DIR, 'folder-service-config.json');
```
**Purpose**: Set up service configuration defaults

**Related Code**:
- `loadConfig()` - Line 87-95
- `saveConfig()` - Line 97-103

---

#### FolderService Class Definition (Lines 58-76)
```typescript
class FolderService {
  private app: Application;
  private server: http.Server;
  private io: SocketIOServer;
  private config: ServiceConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private extractedServices: Map<string, ExtractedService> = new Map();
  private processingQueue: Set<string> = new Set();
}
```
**Purpose**: Main service class with all functionality

**Key Properties**:
- `app`: Express application
- `io`: Socket.IO server for WebSocket
- `config`: Current configuration
- `watcher`: Chokidar file watcher instance
- `extractedServices`: In-memory storage (Map)
- `processingQueue`: Files being processed

---

#### Service Initialization (Lines 105-124)
```typescript
private async initializeService(): Promise<void> {
  // Ensure extract folder exists
  fs.ensureDirSync(this.config.extractFolder);
  
  // Load existing extracted services
  await this.loadExistingServices();
  
  // Start watching if folder is configured
  if (this.config.watchFolder) {
    this.startWatching();
  }
}
```
**Purpose**: Initialize service on startup

**Key Tasks**:
1. Create extract directory if missing
2. Load previously extracted services
3. Start folder watcher (if configured)

---

#### API Routes Setup (Lines 126-281)
**Location**: `setupRoutes()` method

**Endpoints Implemented**:

| Method | Path | Lines | Purpose |
|--------|------|-------|---------|
| GET | /health | 148-156 | Health check |
| GET | /config | 158-160 | Get configuration |
| POST | /config | 162-194 | Update configuration |
| GET | /services | 196-200 | List services |
| GET | /services/:id | 202-207 | Get service details |
| POST | /import/:id | 209-227 | Import service |
| DELETE | /services/:id | 229-243 | Delete service |

**Example Route Analysis** (POST /config - Lines 162-194):
```typescript
this.app.post('/config', async (req: Request, res: Response) => {
  const updates: Partial<ServiceConfig> = req.body;
  
  // Validate watch folder if provided
  if (updates.watchFolder !== undefined) {
    if (updates.watchFolder !== null && !fs.existsSync(updates.watchFolder)) {
      return res.status(400).json({ error: 'Watch folder does not exist' });
    }
  }
  
  // Update config
  const oldWatchFolder = this.config.watchFolder;
  this.config = { ...this.config, ...updates };
  this.saveConfig();
  
  // Restart watcher if folder changed
  if (updates.watchFolder !== undefined && updates.watchFolder !== oldWatchFolder) {
    this.stopWatching();
    if (this.config.watchFolder) {
      this.startWatching();
    }
  }
});
```

---

#### WebSocket Setup (Lines 245-273)
**Location**: `setupSocketIO()` method

**Events Handled**:

| Event | Direction | Purpose |
|-------|-----------|---------|
| connection | Inbound | Client connects |
| config | Inbound | Client updates config |
| import-service | Inbound | Client requests import |
| disconnect | Inbound | Client disconnects |
| config | Outbound | Send current config |
| services | Outbound | Send service list |
| config-updated | Broadcast | Config changed |
| service-import-request | Outbound | Import triggered |

**Code** (Lines 245-273):
```typescript
private setupSocketIO(): void {
  this.io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Send current state
    socket.emit('config', this.config);
    socket.emit('services', Array.from(this.extractedServices.values()));
    
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
    
    socket.on('configure', (config: Partial<ServiceConfig>) => {
      // Handle configuration update
    });
    
    socket.on('import-service', (serviceId: string) => {
      // Handle import request
    });
  });
}
```

---

#### File Watching (Lines 275-320)
**Location**: `startWatching()` and `stopWatching()` methods

**Watcher Configuration** (Lines 301-308):
```typescript
this.watcher = chokidar.watch(this.config.watchFolder, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2 seconds
    pollInterval: 100
  }
});
```

**Events**:
- `.on('add', ...)` - Lines 310-311: New file detected
- `.on('error', ...)` - Lines 312-315: Watcher error

**Key Feature**: 2-second stability threshold ensures file is fully written before processing

---

#### File Processing (Lines 322-381)
**Location**: `handleNewFile()` and `extractAndProcess()` methods

**handleNewFile() - Lines 322-341**:
```typescript
private async handleNewFile(filePath: string): Promise<void> {
  // Only process zip files
  if (!filePath.toLowerCase().endsWith('.zip')) {
    return;
  }
  
  // Skip if already processing
  if (this.processingQueue.has(filePath)) {
    return;
  }
  
  console.log('📦 New zip file detected:', filePath);
  this.processingQueue.add(filePath);
  this.io.emit('service-detected', { path: filePath });
  
  try {
    await this.extractAndProcess(filePath);
  } catch (error) {
    this.io.emit('service-error', { path: filePath, error: error?.message });
  } finally {
    this.processingQueue.delete(filePath);
  }
}
```

**Key Points**:
1. Only processes .zip files (line 326)
2. Prevents duplicate processing (line 330)
3. Emits "service-detected" event (line 335)
4. Catches and reports errors (line 340)

**extractAndProcess() - Lines 343-381**:
```typescript
private async extractAndProcess(zipPath: string): Promise<void> {
  const fileName = path.basename(zipPath, '.zip');
  const serviceId = uuidv4();
  const extractPath = path.join(this.config.extractFolder, serviceId);
  
  try {
    // Extract zip file
    await fs.ensureDir(extractPath);
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();
    
    // Parse service structure
    const serviceItems = await this.parseServiceStructure(extractPath);
    
    // Create service record
    const service: ExtractedService = {
      id: serviceId,
      name: fileName,
      path: extractPath,
      items: serviceItems,
      extractedAt: new Date(),
      sourceZip: zipPath
    };
    
    this.extractedServices.set(serviceId, service);
    
    // Emit event
    this.io.emit('service-extracted', service);
    
    // Delete original zip if configured
    if (this.config.autoDelete) {
      await fs.remove(zipPath);
    }
  } catch (error) {
    // Clean up partial extraction
    await fs.remove(extractPath);
    throw error;
  }
}
```

**Key Points**:
1. Creates UUID for each service (line 347)
2. Uses streaming unzip (line 356-358)
3. Parses structure (line 361)
4. Stores in Map (line 372)
5. Emits notification (line 374)
6. Cleans up on error (line 383)

---

#### Service Structure Parsing (Lines 383-470)
**Location**: `parseServiceStructure()` method

**Main Algorithm** (Lines 383-470):
```typescript
private async parseServiceStructure(servicePath: string): Promise<ServiceItem[]> {
  const items: ServiceItem[] = [];
  
  try {
    // Find the root service folder
    const rootContents = await fs.readdir(servicePath);
    let scanPath = servicePath;
    
    // If there's only one folder, it might be the actual service folder
    if (rootContents.length === 1) {
      const potentialRoot = path.join(servicePath, rootContents[0]);
      const stat = await fs.stat(potentialRoot);
      if (stat.isDirectory()) {
        scanPath = potentialRoot;
      }
    }
    
    // Read all folders in the service directory
    const entries = await fs.readdir(scanPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(scanPath, entry.name);
      const sortOrder = this.extractSortOrder(entry.name);
      const cleanName = this.cleanItemName(entry.name);
      
      // Check if this is a song folder
      const isSong = await this.containsAudioFiles(fullPath);
      
      const item: ServiceItem = {
        id: uuidv4(),
        name: cleanName,
        path: fullPath,
        type: isSong ? 'song' : 'folder',
        sortOrder: sortOrder
      };
      
      items.push(item);
    }
    
    // Sort by order
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return items;
  } catch (error) {
    console.error('❌ Error parsing service structure:', error);
    return [];
  }
}
```

**Key Features**:
1. Handles nested folder structure (lines 393-401)
2. Extracts numeric sort order (line 410)
3. Cleans item names (line 411)
4. Detects audio files for song typing (line 414)
5. Sorts items by numeric order (line 425)

---

#### Sort Order Extraction (Lines 472-477)
```typescript
private extractSortOrder(name: string): number {
  // Extract leading number from "01 - Name" format
  const match = name.match(/^(\d+)\s*[-–—]\s*/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 999; // Default high number for items without prefix
}
```

**Regex Pattern**: `/^(\d+)\s*[-–—]\s*/`
- `^(\d+)` - One or more digits at start
- `\s*` - Optional whitespace
- `[-–—]` - Various dash characters (-, –, —)
- `\s*` - Optional whitespace after dash

**Examples**:
- "01 - Announcements" → 1
- "02-Song Name" → 2
- "03– Item" → 3
- "No Prefix Item" → 999

---

#### Item Name Cleaning (Lines 479-482)
```typescript
private cleanItemName(name: string): string {
  // Remove leading numbers and separators
  return name.replace(/^\d+\s*[-–—]\s*/, '').trim();
}
```

**Examples**:
- "01 - Announcements" → "Announcements"
- "02-Song Name" → "Song Name"
- "03– Item" → "Item"

---

#### Audio File Detection (Lines 484-491)
```typescript
private async containsAudioFiles(folderPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(folderPath);
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
    return files.some(file => 
      audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
  } catch {
    return false;
  }
}
```

**Supported Audio Formats**:
- .mp3 - MPEG Audio
- .wav - WAV Audio
- .ogg - Ogg Vorbis
- .flac - Free Lossless Audio Codec
- .m4a - MPEG-4 Audio
- .aac - Advanced Audio Coding

---

#### Load Existing Services (Lines 493-525)
**Location**: `loadExistingServices()` method

**Purpose**: On startup, scan extract folder for previously extracted services

**Process**:
1. Read extract folder directory
2. For each subdirectory, parse its structure
3. Load metadata into memory Map
4. Log count of loaded services

**Code**:
```typescript
private async loadExistingServices(): Promise<void> {
  try {
    const extractFolder = this.config.extractFolder;
    if (!fs.existsSync(extractFolder)) {
      return;
    }

    const entries = await fs.readdir(extractFolder, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const servicePath = path.join(extractFolder, entry.name);
      const items = await this.parseServiceStructure(servicePath);

      if (items.length > 0) {
        const service: ExtractedService = {
          id: entry.name,
          name: entry.name,
          path: servicePath,
          items: items,
          extractedAt: new Date(0),
          sourceZip: 'unknown'
        };

        this.extractedServices.set(entry.name, service);
        console.log(`📂 Loaded existing service: ${entry.name}`);
      }
    }

    console.log(`✅ Loaded ${this.extractedServices.size} existing services`);
  } catch (error) {
    console.error('❌ Error loading existing services:', error);
  }
}
```

---

#### Server Start (Lines 527-550)
```typescript
public start(): void {
  this.server.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   🗂️  HarmonySync Folder Service                         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║   🌐 Server: http://${HOST}:${PORT}`);
    console.log(`║   📂 Watch Folder: ${this.config.watchFolder || 'Not configured'}`);
    console.log(`║   📁 Extract Folder: ${path.basename(this.config.extractFolder)}`);
    console.log(`║   🗑️  Auto-delete: ${this.config.autoDelete ? 'Enabled' : 'Disabled'}`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
  });
}
```

---

#### Graceful Shutdown (Lines 552-565)
```typescript
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  service.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  service.stop();
  process.exit(0);
});
```

**Signals Handled**:
- SIGINT - Ctrl+C from user
- SIGTERM - systemctl stop command

---

## Supporting Files

### client.ts - Example Client
**Purpose**: Demonstrates how to connect to the service

**Key Components**:
```typescript
const io = require('socket.io-client');
const client = io('http://localhost:3005');

// Listen for services
client.on('services', (services) => {
  console.log('Available services:', services);
});

// Listen for new extractions
client.on('service-extracted', (service) => {
  console.log('New service extracted:', service.name);
});

// Request import
client.emit('import-service', serviceId);
```

### test-client.ts - Testing Client
**Purpose**: Automated testing of service functionality

### install-service.ts - Linux Installation
**Purpose**: Create systemd service unit for automatic boot

**Creates**: `/etc/systemd/system/harmonysync-folder-service`

### install-service.sh - systemd Setup Script
**Purpose**: Bash script to create systemd unit file

### package.json - Dependencies
**Key Dependencies**:
- `express` - HTTP server
- `socket.io` - WebSocket communication
- `chokidar` - File watching
- `unzipper` - Zip extraction
- `fs-extra` - File system utilities
- `uuid` - ID generation
- `cors` - CORS middleware

---

## Type Definitions

### ServiceConfig
```typescript
interface ServiceConfig {
  watchFolder: string | null;           // Folder to monitor for zips
  extractFolder: string;                // Where to extract services
  autoDelete: boolean;                  // Delete original zip after extraction
  port: number;                         // HTTP port (default 3005)
}
```

### ServiceItem
```typescript
interface ServiceItem {
  id: string;                           // UUID
  name: string;                         // Display name (cleaned)
  path: string;                         // Full path to item folder
  type: 'folder' | 'song' | 'presentation';  // Item type
  sortOrder: number;                    // Numeric order (01, 02, etc.)
  children?: ServiceItem[];             // For nested structures
}
```

### ExtractedService
```typescript
interface ExtractedService {
  id: string;                           // Service UUID
  name: string;                         // Service name
  path: string;                         // Full extraction path
  items: ServiceItem[];                 // Service items
  extractedAt: Date;                    // Extraction timestamp
  sourceZip: string;                    // Original zip file path
}
```

---

## Extension Points

### Adding New Item Types
**Location**: `containsAudioFiles()` method

To detect new types, add methods:
```typescript
private async containsVideoFiles(folderPath: string): Promise<boolean> {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  // Similar logic as audio detection
}

private async containsPresentationFiles(folderPath: string): Promise<boolean> {
  const presentationExtensions = ['.pptx', '.odp', '.pdf'];
  // Similar logic
}
```

Then update `parseServiceStructure()` to use these.

### Adding New API Endpoints
**Location**: `setupRoutes()` method

Template:
```typescript
this.app.get('/api/new-endpoint', async (req: Request, res: Response) => {
  try {
    // Your logic here
    res.json({ /* response */ });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});
```

### Adding New WebSocket Events
**Location**: `setupSocketIO()` method

Template:
```typescript
socket.on('new-event', (data) => {
  // Handle incoming event
  this.io.emit('response-event', result);
});
```

---

## Testing Hooks

### Unit Test Example
```typescript
describe('FolderService', () => {
  it('should extract sort order from folder name', () => {
    const service = new FolderService();
    expect(service['extractSortOrder']('01 - Item')).toBe(1);
    expect(service['extractSortOrder']('10-Item')).toBe(10);
    expect(service['extractSortOrder']('NoPrefix')).toBe(999);
  });
});
```

### Integration Test Example
```typescript
describe('Service Extraction', () => {
  it('should extract and parse a zip file', async () => {
    // Create test zip
    // Place in watch folder
    // Wait for extraction
    // Verify API response
    // Check disk contents
  });
});
```

---

## Deployment Checklist

- [ ] Build: `pnpm build`
- [ ] Test: `pnpm test`
- [ ] Configure: `~/.harmonysync/folder-service-config.json`
- [ ] Install (Linux): `sudo pnpm run install-service`
- [ ] Enable (Linux): `sudo systemctl enable harmonysync-folder-service`
- [ ] Start (Linux): `sudo systemctl start harmonysync-folder-service`
- [ ] Verify: `curl http://localhost:3005/health`

---

## Version Information

**Source File**: `apps/harmonysync-folder-service/server.ts`
**Lines**: 568 total
**Classes**: 1 main (FolderService)
**Methods**: 20+
**Files to Modify**: 1 core file
**Dependencies**: 9 npm packages

