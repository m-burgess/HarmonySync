# HarmonySync Folder Service - Installation Summary

## ✅ Service Created Successfully!

A new microservice has been created at:
```
/workspaces/RustPresenter/apps/harmonysync-folder-service/
```

## 📦 What Was Created

### Core Files
- **server.ts** - Main service implementation with file watching, extraction, and API
- **client.ts** - TypeScript client library for integration with Electron app
- **package.json** - Dependencies and build scripts
- **tsconfig.json** - TypeScript configuration

### Installation & Deployment
- **install-service.sh** - Systemd service installation script
- **install-service.ts** - Installation helper (callable from npm)
- **uninstall-service.sh** - Service removal script

### Integration & Testing
- **integration-example.ts** - Complete Electron app integration example
- **test-client.ts** - Service testing utility
- **create-test-service.sh** - Creates test zip files for validation

### Documentation
- **README.md** - Project overview and features
- **USAGE.md** - Complete usage guide with examples
- **ARCHITECTURE.md** - Detailed technical architecture
- **openapi.yml** - REST API specification

### Configuration
- **.gitignore** - Git ignore rules

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /workspaces/RustPresenter/apps/harmonysync-folder-service
pnpm install
```

### 2. Build the Service
```bash
pnpm build
```

### 3. Install as System Service (Linux)
```bash
sudo pnpm run install-service
```

### 4. Configure Watch Folder
```bash
curl -X POST http://127.0.0.1:3005/config \
  -H "Content-Type: application/json" \
  -d '{
    "watchFolder": "/home/user/Downloads/services"
  }'
```

### 5. Test It
```bash
./create-test-service.sh
```

## 📋 Features Implemented

✅ **Automatic Folder Monitoring**
   - Uses chokidar to watch specified directory
   - Detects new .zip files automatically
   - Waits for file write completion

✅ **Smart Extraction**
   - Extracts zip files to organized directory
   - Creates unique ID for each service
   - Handles nested folder structures

✅ **Intelligent Ordering**
   - Parses numeric prefixes (01-, 02-, 03-)
   - Sorts service items automatically
   - Cleans display names

✅ **Type Detection**
   - Identifies songs (folders with audio files)
   - Detects presentations and other content
   - Maintains folder hierarchy

✅ **REST API**
   - GET /health - Service health check
   - GET /config - Get configuration
   - POST /config - Update configuration
   - GET /services - List extracted services
   - GET /services/:id - Get service details
   - POST /import/:id - Import service
   - DELETE /services/:id - Delete service

✅ **Real-time Updates (Socket.IO)**
   - service-detected - New zip found
   - service-extracted - Extraction complete
   - service-import-request - Ready to import
   - service-deleted - Service removed
   - service-error - Error occurred
   - config-updated - Configuration changed

✅ **Systemd Integration**
   - Runs on system boot
   - Auto-restart on failure
   - Systemd journal logging
   - User-level service (not root)

✅ **Configuration Management**
   - JSON config file (~/.harmonysync/folder-service-config.json)
   - Hot-reload on config changes
   - Validates configuration

✅ **Client Library**
   - TypeScript client for Electron integration
   - Event-driven API
   - Promise-based HTTP methods
   - Auto-reconnection

## 🔧 Configuration Options

```typescript
interface ServiceConfig {
  watchFolder: string | null;      // Folder to monitor
  extractFolder: string;           // Where to extract services
  autoDelete: boolean;             // Delete zip after extraction
  port: number;                    // Service port (default: 3005)
}
```

## 📁 Expected Folder Structure

When creating service zip files, use this structure:

```
Service Order [Date].zip
├── 01 - Announcements/
│   ├── slide1.png
│   └── slide2.png
├── 02 - 5 Minute Countdown/
│   └── countdown.mp4
├── 03 - Song 1/
│   ├── track1.mp3
│   └── track2.mp3
├── 04 - Sermon/
│   ├── sermon.mp4
│   └── slides/
└── 05 - Special Services/
    └── wedding/
```

**Important**: Use numeric prefixes (01, 02, etc.) to define the service order!

## 🔗 Integration with Electron App

### Step 1: Import Client
```typescript
import { FolderServiceClient } from '../harmonysync-folder-service/client';
```

### Step 2: Initialize
```typescript
const folderClient = new FolderServiceClient();
await folderClient.connect();
```

### Step 3: Handle Events
```typescript
folderClient.on('service-import-request', async (service) => {
  // Convert to ServiceOrder format
  const items = service.items.map(item => ({
    id: item.id,
    name: item.name,
    path: item.path,
    type: item.type
  }));
  
  // Load into application
  await serviceOrderViewModel.handleServiceImported({ 
    serviceOrder: items 
  });
});
```

See [integration-example.ts](integration-example.ts) for complete code.

## 📊 Service Management

### Check Status
```bash
sudo systemctl status harmonysync-folder-service
```

### View Logs
```bash
journalctl -u harmonysync-folder-service -f
```

### Restart Service
```bash
sudo systemctl restart harmonysync-folder-service
```

### Stop Service
```bash
sudo systemctl stop harmonysync-folder-service
```

## 🧪 Testing

### Create Test Service
```bash
./create-test-service.sh
```

### Test Client
```bash
pnpm build
node dist/test-client.js
```

### Manual API Testing
```bash
# Health check
curl http://127.0.0.1:3005/health

# List services
curl http://127.0.0.1:3005/services

# Get service details
curl http://127.0.0.1:3005/services/{id}
```

## 🐛 Troubleshooting

### Service Won't Start
- Check if port 3005 is available: `lsof -i :3005`
- View logs: `journalctl -u harmonysync-folder-service -n 50`
- Verify Node.js is installed: `node --version`

### Not Detecting Files
- Confirm watch folder is set: `curl http://127.0.0.1:3005/config`
- Check folder permissions
- Verify zip file is valid: `unzip -t file.zip`

### Extraction Fails
- Check available disk space: `df -h`
- Verify extract folder permissions
- Check logs for specific error

## 📚 Documentation

- **README.md** - Overview and quick start
- **USAGE.md** - Detailed usage guide
- **ARCHITECTURE.md** - Technical deep-dive
- **openapi.yml** - API specification
- **integration-example.ts** - Integration code

## 🎯 Next Steps

1. **Install the service**:
   ```bash
   cd /workspaces/RustPresenter/apps/harmonysync-folder-service
   pnpm install
   pnpm build
   sudo pnpm run install-service
   ```

2. **Configure watch folder**:
   - Edit `~/.harmonysync/folder-service-config.json`
   - Or use the API: `POST /config`

3. **Test with sample data**:
   ```bash
   ./create-test-service.sh
   ```

4. **Integrate with Electron app**:
   - Add client to main process
   - Register IPC handlers
   - Connect renderer UI

5. **Create real service packages**:
   - Use naming convention (01-, 02-, etc.)
   - Zip your service folders
   - Drop in watch folder

## 🎉 Complete!

Your folder-service microservice is ready to use! It will:
- ✅ Start automatically on boot
- ✅ Monitor your downloads folder
- ✅ Extract service packages automatically
- ✅ Sort items by numeric order
- ✅ Notify your main app when services are ready
- ✅ Integrate seamlessly with ServiceOrder system

---

**Service Port**: 3005  
**Health Check**: http://127.0.0.1:3005/health  
**API Docs**: openapi.yml  
**Version**: 1.0.0
