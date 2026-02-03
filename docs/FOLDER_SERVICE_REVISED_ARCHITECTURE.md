# Folder Service - Revised Architecture

## Old Approach (Complex)
```
┌─────────────────────────────────────────────────────────┐
│ OS Boots                                               │
├─────────────────────────────────────────────────────────┤
│ Folder Service (Node.js Microservice) starts           │
│ - Watches folder continuously                          │
│ - Monitors for .zip files                              │
│ - Extracts automatically                               │
│ - Emits WebSocket events                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Electron App starts                                     │
│ - Connects to Folder Service                           │
│ - Listens for "service-extracted" events              │
│ - User clicks Import                                   │
│ - Service order loaded                                │
└─────────────────────────────────────────────────────────┘

Problems:
❌ Need OS-level service registration
❌ Need systemd/Task Scheduler/launchd
❌ Adds system complexity
❌ Background service always running
❌ Separate process management
```

## New Approach (Simple & User-Driven)
```
┌─────────────────────────────────────────────────────────┐
│ User Configures Settings                              │
│ - Select watch folder path                            │
│ - Enable/disable auto-import                          │
│ - Saved to app settings                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Electron App Starts                                     │
│ 1. Check configured watch folder for .zip files       │
│ 2. If found: Display "Service Order Found" banner     │
│ 3. User clicks to import                              │
│ 4. Extract zip → Parse → Load service order           │
│ 5. Display in UI with option to edit/confirm         │
└─────────────────────────────────────────────────────────┘

Benefits:
✅ No OS-level service needed
✅ All logic in Electron app
✅ User-initiated, not background
✅ Clear visual feedback
✅ Better UX with confirmation
✅ Easier to troubleshoot
✅ No resource drain
✅ Simpler installation
```

---

## Revised Workflow

### 1. Settings Configuration
```
Settings Panel
├─ Watch Folder Path
│  └─ [Browse Button] → Select folder
├─ Auto-Import on Startup
│  └─ [Toggle] Enable/Disable
└─ Clear Imported Services
   └─ [Button] Delete old extractions
```

**Stored in**: `~/.harmonysync/app-settings.json`
```json
{
  "watchFolder": "/home/user/Downloads/HarmonySync",
  "autoImportOnStartup": true,
  "lastImportedService": "uuid-here"
}
```

### 2. Application Startup Flow
```
App Launches
│
├─ Load Settings
│
├─ Check if watchFolder configured
│  ├─ NO → Show settings panel
│  └─ YES → Scan folder
│
├─ Scan Watch Folder for .zip files
│  ├─ None found → Continue normally
│  ├─ One found → Show import banner
│  └─ Multiple found → Show selection dialog
│
└─ On Import Click
   ├─ Extract zip
   ├─ Parse structure
   ├─ Show service order preview
   └─ User confirms → Load into app
```

### 3. Import UI
```
┌─────────────────────────────────────────────────────────┐
│ 📦 Service Order Found!                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Service: "Service Order 2025-02-02"                   │
│                                                         │
│ Items:                                                 │
│  • 01 - Announcements                                 │
│  • 02 - Song 1                                        │
│  • 03 - Sermon                                        │
│  • 04 - Special Items                                 │
│                                                         │
│        [Cancel]  [Import Service Order]                │
└─────────────────────────────────────────────────────────┘
```

### 4. After Import
```
Service order items automatically:
│
├─ Load all media files from extracted folder
├─ Populate song tracks and metadata
├─ Link presentation files
├─ Organize by sort order
└─ Ready to broadcast!
```

---

## Code Location & Implementation

### Electron App Changes

**File**: `apps/electron-app/main.ts`

**Add Near App Ready**:
```typescript
// On app ready or after main window created
async function checkForServiceOrderZip() {
  const settings = loadSettings();
  
  if (!settings.watchFolder) {
    return; // User hasn't configured watch folder
  }
  
  // Scan folder for zip files
  const zipFiles = await scanFolderForZips(settings.watchFolder);
  
  if (zipFiles.length === 0) {
    return; // No zip files found
  }
  
  // Show import dialog to user
  if (zipFiles.length === 1) {
    showImportDialog(zipFiles[0]);
  } else {
    showSelectServiceDialog(zipFiles);
  }
}

// Call this after window is created
ipcMain.on('app-ready', async () => {
  await checkForServiceOrderZip();
});
```

**File**: `apps/electron-app/electron/services/service-order-importer.ts` (NEW)

```typescript
import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';

export class ServiceOrderImporter {
  async scanFolderForZips(folderPath: string): Promise<string[]> {
    if (!fs.existsSync(folderPath)) {
      return [];
    }
    
    const files = await fs.readdir(folderPath);
    return files
      .filter(f => f.toLowerCase().endsWith('.zip'))
      .map(f => path.join(folderPath, f));
  }

  async extractZip(zipPath: string): Promise<string> {
    const extractPath = path.join(
      process.env.APPDATA || process.env.HOME,
      '.harmonysync',
      'service-order-' + uuidv4()
    );
    
    await fs.ensureDir(extractPath);
    
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();
    
    return extractPath;
  }

  async parseServiceOrder(extractPath: string): Promise<ServiceOrderMetadata> {
    // Reuse parser logic from folder-service
    // Or extract common parser to shared package
    
    const items = await this.parseItems(extractPath);
    
    return {
      id: uuidv4(),
      name: path.basename(extractPath),
      path: extractPath,
      items: items,
      extractedAt: new Date()
    };
  }

  private async parseItems(folderPath: string): Promise<ServiceItem[]> {
    // Same logic as folder-service parseServiceStructure
    // Extract numeric order from folder names
    // Detect item types
    // Return sorted items
  }
}
```

**File**: `apps/electron-app/preload.ts`

**Add Handler**:
```typescript
contextBridge.exposeInMainWorld('serviceOrderAPI', {
  scanForZips: (folderPath) => ipcRenderer.invoke('scan-zips', folderPath),
  importZip: (zipPath) => ipcRenderer.invoke('import-zip', zipPath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings)
});
```

**File**: `apps/electron-app/ipc-handlers.ts`

**Add Handlers**:
```typescript
ipcMain.handle('scan-zips', async (event, folderPath) => {
  const importer = new ServiceOrderImporter();
  return await importer.scanFolderForZips(folderPath);
});

ipcMain.handle('import-zip', async (event, zipPath) => {
  const importer = new ServiceOrderImporter();
  const extractPath = await importer.extractZip(zipPath);
  const metadata = await importer.parseServiceOrder(extractPath);
  return metadata;
});
```

**File**: `apps/renderer/src/views/ServiceOrderImportDialog.tsx` (NEW)

```tsx
import React, { useState, useEffect } from 'react';

export function ServiceOrderImportDialog() {
  const [serviceOrder, setServiceOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for zips on mount
    const checkForZips = async () => {
      const settings = await window.serviceOrderAPI.getSettings();
      const zips = await window.serviceOrderAPI.scanForZips(settings.watchFolder);
      
      if (zips.length > 0) {
        setLoading(true);
        const metadata = await window.serviceOrderAPI.importZip(zips[0]);
        setServiceOrder(metadata);
        setLoading(false);
      }
    };

    checkForZips();
  }, []);

  if (!serviceOrder) return null;

  return (
    <div className="import-dialog">
      <h2>📦 Service Order Found!</h2>
      
      <div className="service-info">
        <h3>{serviceOrder.name}</h3>
        
        <div className="items-list">
          <h4>Items:</h4>
          <ul>
            {serviceOrder.items.map(item => (
              <li key={item.id}>
                {item.sortOrder} - {item.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => setServiceOrder(null)}>Cancel</button>
        <button 
          onClick={() => importServiceOrder(serviceOrder)}
          className="primary"
        >
          Import Service Order
        </button>
      </div>
    </div>
  );
}
```

---

## Settings Integration

**File**: `apps/renderer/src/views/Settings.tsx`

**Add Section**:
```tsx
<section className="settings-section">
  <h3>Service Order Folder</h3>
  
  <div className="setting">
    <label>Watch Folder Path:</label>
    <div className="input-group">
      <input 
        type="text" 
        value={settings.watchFolder}
        readOnly
      />
      <button onClick={() => selectFolder()}>Browse</button>
    </div>
    <p className="help-text">
      Select a folder where you'll place zipped service orders.
      The app will detect them when it starts.
    </p>
  </div>

  <div className="setting">
    <label>
      <input 
        type="checkbox" 
        checked={settings.autoImportOnStartup}
        onChange={(e) => updateSetting('autoImportOnStartup', e.target.checked)}
      />
      Auto-import service order on startup
    </label>
  </div>

  <div className="setting">
    <button onClick={() => clearExtractedServices()}>
      Clear Imported Services
    </button>
    <p className="help-text">
      Delete previously extracted service orders from disk.
    </p>
  </div>
</section>
```

---

## Benefits of This Approach

| Aspect | Old (Folder Service) | New (Electron-Based) |
|--------|---------------------|----------------------|
| **Installation** | Complex (systemd) | Simple (checkbox in settings) |
| **Resource Usage** | Always running | Only when app runs |
| **User Control** | Background (automatic) | Foreground (user-initiated) |
| **Troubleshooting** | Separate service logs | App logs, clear UI feedback |
| **Uninstall** | Remove systemd unit | Uncheck setting |
| **Multi-OS** | Needs Linux/Mac/Windows variants | Works the same everywhere |
| **UX** | Silent extraction | Clear visual feedback |
| **Confirmation** | No preview | Show import dialog first |

---

## Migration Path

### Phase 1: Add Electron-Based Import
1. Create ServiceOrderImporter class
2. Add settings for watch folder
3. Add import dialog UI
4. Implement startup scan

### Phase 2: Keep Folder Service Optional
- Make folder service optional (users who want background monitoring)
- Works alongside new Electron importer
- Or remove entirely if not needed

### Phase 3: Deprecate OS Service
- Remove systemd installation requirement
- Simplify documentation
- Keep folder-service as optional add-on for advanced users

---

## File Structure Change

```
// BEFORE: Separate service
apps/harmonysync-folder-service/
├── server.ts
├── client.ts
├── package.json
└── ...

apps/electron-app/
├── main.ts
└── ...

// AFTER: All in Electron app
apps/electron-app/
├── electron/
│  └── services/
│     ├── service-order-importer.ts (NEW)
│     └── ...
├── src/
│  └── views/
│     ├── ServiceOrderImportDialog.tsx (NEW)
│     ├── Settings.tsx (UPDATED)
│     └── ...
├── ipc-handlers.ts (UPDATED)
├── main.ts (UPDATED)
└── preload.ts (UPDATED)

// Optional: Keep folder-service for advanced users
apps/harmonysync-folder-service/
└── (unchanged or marked as deprecated)
```

---

## Configuration Example

```json
// ~/.harmonysync/app-settings.json
{
  "windowState": {
    "width": 1200,
    "height": 800,
    "x": 100,
    "y": 100
  },
  "serviceOrder": {
    "watchFolder": "/home/user/Downloads/HarmonySync",
    "autoImportOnStartup": true,
    "lastImportedService": "uuid-xxx-xxx-xxx"
  },
  "display": {
    "theme": "dark",
    "fontSize": "medium"
  }
}
```

---

## This Approach Is Better Because

1. **Simpler**: No OS-level service installation
2. **More User-Friendly**: Clear visual feedback "Service Order Found"
3. **Safer**: User confirms import before making changes
4. **Easier to Debug**: All in one application
5. **Better UX**: Import dialog shows what will be imported
6. **Cross-Platform**: No OS-specific setup needed
7. **Lighter**: No background service consuming resources
8. **Cleaner**: No WebSocket complexity needed
9. **Faster**: Import only when user starts app
10. **More Flexible**: Can easily add more import options later

---

## Next Steps

1. Create `ServiceOrderImporter` class in electron-app
2. Add settings UI for watch folder selection
3. Create import dialog component
4. Wire up IPC handlers
5. Test with sample zip files
6. Consider deprecating folder-service or making it optional
