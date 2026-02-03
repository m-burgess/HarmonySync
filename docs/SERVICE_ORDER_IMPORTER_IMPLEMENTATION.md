# Service Order Importer - Implementation Guide

## Overview

The new **Service Order Importer** replaces the need for a separate OS-level folder service by integrating service order import functionality directly into the Electron app. This provides a simpler, more user-friendly workflow.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron Main Process                      │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   ServiceOrderImporter Class                          │   │
│  │                                                        │   │
│  │  • scanFolderForZips(folderPath)                     │   │
│  │  • extractZip(zipPath)                               │   │
│  │  • parseServiceOrder(extractPath)                    │   │
│  │  • validateServiceOrder(metadata)                    │   │
│  │  • listImportedServices()                            │   │
│  │  • deleteServiceOrder(serviceId)                     │   │
│  │  • cleanupOldServices(maxAge)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↕ IPC                                │
└──────────────────────────────────────────────────────────────┘
                           ↕
┌──────────────────────────────────────────────────────────────┐
│                   Renderer Process (React)                    │
│                                                                │
│  User Settings → Configure watch folder                       │
│  App Startup  → Check for zips → Show import dialog          │
│  Import Button → Extract & parse → Load into UI              │
└──────────────────────────────────────────────────────────────┘
```

## Files Implemented

### 1. ServiceOrderImporter Class
**Location**: `apps/electron-app/electron/services/service-order-importer.ts`

**Purpose**: Handles all service order import operations

**Key Methods**:
- `scanFolderForZips(folderPath)` - Scans a folder for .zip files
- `extractZip(zipPath)` - Extracts zip to `~/.harmonysync/imported-service-orders/{uuid}`
- `parseServiceOrder(extractPath)` - Parses folder structure and creates metadata
- `validateServiceOrder(metadata)` - Validates service order structure
- `listImportedServices()` - Lists all previously imported services
- `getServiceOrder(serviceId)` - Retrieves a specific service order
- `deleteServiceOrder(serviceId)` - Deletes an imported service order
- `cleanupOldServices(maxAge)` - Removes old imported services

**Types Defined**:
```typescript
interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation' | 'video' | 'image';
  sortOrder: number;
  children?: ServiceItem[];
}

interface ServiceOrderMetadata {
  id: string;
  name: string;
  path: string;
  items: ServiceItem[];
  extractedAt: Date;
  sourceZip?: string;
}
```

### 2. IPC Handlers
**Location**: `apps/electron-app/ipc-handlers.ts`

**Added Handlers**:
- `service-order:scanForZips` - Scan watch folder for zips
- `service-order:importZip` - Import and extract a zip
- `service-order:listImported` - List all imported services
- `service-order:getService` - Get specific service by ID
- `service-order:deleteService` - Delete a service order
- `service-order:cleanup` - Clean up old service orders

**Response Format**:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

### 3. Preload API
**Location**: `apps/electron-app/preload.ts`

**Added to ElectronAPI Interface**:
```typescript
serviceOrderScanForZips: (folderPath: string) => Promise<any>;
serviceOrderImportZip: (zipPath: string) => Promise<any>;
serviceOrderListImported: () => Promise<any>;
serviceOrderGetService: (serviceId: string) => Promise<any>;
serviceOrderDeleteService: (serviceId: string) => Promise<any>;
serviceOrderCleanup: (maxAgeDays?: number) => Promise<any>;
```

**Exposed in Renderer**:
```typescript
window.electronAPI.serviceOrderScanForZips(folderPath)
window.electronAPI.serviceOrderImportZip(zipPath)
window.electronAPI.serviceOrderListImported()
window.electronAPI.serviceOrderGetService(serviceId)
window.electronAPI.serviceOrderDeleteService(serviceId)
window.electronAPI.serviceOrderCleanup(7)
```

### 4. Main Process Integration
**Location**: `apps/electron-app/main.ts`

**Changes**:
- Import ServiceOrderImporter class
- Initialize `serviceOrderImporter` instance
- Pass to IPC handler setup in services object

## Usage Examples

### From Renderer Process (React Component)

#### Scan for Service Order Zips
```typescript
const result = await window.electronAPI.serviceOrderScanForZips('/path/to/watch/folder');
if (result.success) {
  console.log(`Found ${result.count} zip files:`, result.zips);
}
```

#### Import a Service Order
```typescript
const result = await window.electronAPI.serviceOrderImportZip('/path/to/service.zip');
if (result.success) {
  const metadata = result.metadata;
  console.log('Service imported:', metadata.name);
  console.log('Items:', metadata.items);
  
  // Show validation warnings
  if (result.validation.warnings.length > 0) {
    console.warn('Warnings:', result.validation.warnings);
  }
}
```

#### List All Imported Services
```typescript
const result = await window.electronAPI.serviceOrderListImported();
if (result.success) {
  result.services.forEach(service => {
    console.log(`${service.name} - ${service.items.length} items`);
  });
}
```

#### Get Specific Service
```typescript
const result = await window.electronAPI.serviceOrderGetService('service-uuid');
if (result.success && result.service) {
  console.log('Service found:', result.service);
}
```

#### Delete Service Order
```typescript
const result = await window.electronAPI.serviceOrderDeleteService('service-uuid');
if (result.success) {
  console.log('Service deleted');
}
```

#### Cleanup Old Services
```typescript
// Remove services older than 7 days
const result = await window.electronAPI.serviceOrderCleanup(7);
if (result.success) {
  console.log(`Cleaned up ${result.deleted} old service orders`);
}
```

## Service Order Structure

### Expected Zip Structure
```
service-order.zip
├── 01 - Announcements/
│   ├── slide1.png
│   └── slide2.png
├── 02 - Worship/
│   ├── song1.mp3
│   ├── lyrics.txt
│   └── background.jpg
├── 03 - Sermon/
│   ├── sermon.pptx
│   └── notes.pdf
└── 04 - Closing Song/
    ├── song.mp3
    └── lyrics.txt
```

### Extracted Location
```
~/.harmonysync/imported-service-orders/
└── {uuid}/
    ├── 01 - Announcements/
    ├── 02 - Worship/
    ├── 03 - Sermon/
    └── 04 - Closing Song/
```

### Parsed Metadata
```json
{
  "id": "uuid",
  "name": "Sunday Service - Jan 15",
  "path": "/path/to/extracted/folder",
  "extractedAt": "2025-01-15T10:00:00Z",
  "items": [
    {
      "id": "item-uuid-1",
      "name": "Announcements",
      "path": "/path/to/01 - Announcements",
      "type": "folder",
      "sortOrder": 1
    },
    {
      "id": "item-uuid-2",
      "name": "Worship",
      "path": "/path/to/02 - Worship",
      "type": "song",
      "sortOrder": 2
    }
  ]
}
```

## Item Type Detection

The service order importer automatically detects item types based on file extensions:

| Type | Extensions |
|------|-----------|
| **song** | .mp3, .wav, .ogg, .flac, .m4a, .aac |
| **video** | .mp4, .mov, .avi, .mkv, .webm |
| **presentation** | .pptx, .odp, .pdf, .ppt |
| **image** | .jpg, .jpeg, .png, .gif, .bmp, .svg |
| **folder** | Default (no specific files) |

## Validation

The importer validates service orders and returns:

```typescript
{
  valid: boolean;
  errors: string[];    // Critical errors that prevent import
  warnings: string[];  // Non-critical issues (e.g., missing sermon)
}
```

### Common Warnings:
- First item should be "Announcements"
- No songs found in service order
- No sermon found in service order

## Next Steps (UI Implementation)

### 1. Settings Panel
Create a settings section for service order imports:
- Watch folder path input with browse button
- Auto-import on startup toggle
- Clear imported services button

### 2. Import Dialog Component
Create `ServiceOrderImportDialog.tsx`:
- Display found service order name
- Show list of items with types
- Display validation warnings
- Cancel and Import buttons
- Loading state during extraction

### 3. App Startup Check
Add to `main.ts`:
```typescript
async function checkForServiceOrderZip() {
  const settings = await loadAppSettings();
  if (!settings.watchFolder || !settings.autoImportOnStartup) {
    return;
  }

  const result = await serviceOrderImporter.scanFolderForZips(settings.watchFolder);
  if (result.length > 0) {
    // Send event to renderer to show import dialog
    mainWindow.webContents.send('service-order-found', {
      zips: result
    });
  }
}

// Call after app is ready
app.whenReady().then(() => {
  // ... other initialization
  setTimeout(checkForServiceOrderZip, 2000); // Delay to ensure UI is ready
});
```

### 4. Settings Storage
Create `~/.harmonysync/app-settings.json`:
```json
{
  "watchFolder": "/path/to/watch/folder",
  "autoImportOnStartup": true,
  "lastImportedService": "service-uuid",
  "cleanupOldServices": true,
  "maxServiceAge": 7
}
```

## Benefits vs. Folder Service

| Aspect | Old (Folder Service) | New (Electron-Based) |
|--------|---------------------|----------------------|
| Installation | Complex OS service | Simple app feature |
| Resource Usage | Always running | Only when app runs |
| User Control | Background/automatic | User-initiated with UI |
| UX Feedback | Silent | Clear dialog with preview |
| Troubleshooting | Separate service logs | App logs, UI feedback |
| Multi-OS Support | 3 variants needed | Works identically |
| Confirmation | No preview | Shows what will import |

## Testing

### Manual Testing Checklist
1. ✅ Scan empty folder (returns empty array)
2. ✅ Scan folder with zips (returns paths)
3. ✅ Extract valid zip (creates folder structure)
4. ✅ Parse extracted service (returns metadata)
5. ✅ Validate service order (returns validation result)
6. ✅ List imported services (returns array)
7. ✅ Get specific service (returns service or null)
8. ✅ Delete service (removes folder)
9. ✅ Cleanup old services (removes based on age)

### Error Handling
All methods catch errors and return structured responses:
```typescript
{
  success: false,
  error: "Error message here"
}
```

## Migration from Folder Service

If the old folder service was in use:

1. **Stop the OS service**:
   ```bash
   # Linux
   sudo systemctl stop harmonysync-folder-service
   sudo systemctl disable harmonysync-folder-service
   
   # macOS
   launchctl unload ~/Library/LaunchAgents/com.harmonysync.folder-service.plist
   
   # Windows
   # Stop from Services.msc
   ```

2. **Move existing extracted services** (optional):
   ```bash
   # Copy from old location to new
   cp -r /old/extracted/path/* ~/.harmonysync/imported-service-orders/
   ```

3. **Configure in app settings**:
   - Set watch folder path
   - Enable auto-import if desired

4. **Remove old folder service**:
   ```bash
   # Can safely delete apps/harmonysync-folder-service
   ```

## Troubleshooting

### Issue: No zips found
**Check**:
- Watch folder path is correct
- Folder permissions allow reading
- Files have .zip extension

### Issue: Extraction fails
**Check**:
- Zip file is not corrupted
- Sufficient disk space in `~/.harmonysync/imported-service-orders/`
- Write permissions in home directory

### Issue: Parsing fails
**Check**:
- Zip contains folders with numeric prefixes (e.g., "01 - Item")
- Folder structure is not deeply nested
- No special characters in folder names

### Issue: IPC handler not found
**Check**:
- ServiceOrderImporter is initialized in main.ts
- Service is passed to setupIpcHandlers
- Preload script is properly built and loaded

## Conclusion

The new Service Order Importer provides a much simpler and more integrated solution compared to the previous OS-level folder service. It removes installation complexity, provides better user feedback, and maintains all the functionality needed for service order imports.

All core functionality is implemented and ready to use. The next step is to create the UI components (settings panel and import dialog) to provide a complete user experience.
