# Service Order Importer - Quick Reference

## 🚀 Quick Start

### From Renderer (React/JavaScript)

```typescript
// 1. Scan for zips in a folder
const scanResult = await window.electronAPI.serviceOrderScanForZips('/path/to/folder');
// Returns: { success: true, zips: ['path1.zip', 'path2.zip'], count: 2 }

// 2. Import a service order
const importResult = await window.electronAPI.serviceOrderImportZip('/path/to/service.zip');
// Returns: { success: true, metadata: {...}, validation: {...} }

// 3. List all imported services
const listResult = await window.electronAPI.serviceOrderListImported();
// Returns: { success: true, services: [...], count: 5 }

// 4. Get a specific service
const getResult = await window.electronAPI.serviceOrderGetService('service-uuid');
// Returns: { success: true, service: {...} }

// 5. Delete a service
const deleteResult = await window.electronAPI.serviceOrderDeleteService('service-uuid');
// Returns: { success: true }

// 6. Cleanup old services (older than N days)
const cleanupResult = await window.electronAPI.serviceOrderCleanup(7);
// Returns: { success: true, deleted: 3 }
```

## 📦 API Reference

### `serviceOrderScanForZips(folderPath: string)`
Scans a folder for `.zip` files.

**Parameters**:
- `folderPath` - Absolute path to folder to scan

**Returns**:
```typescript
{
  success: boolean;
  zips: string[];     // Array of zip file paths
  count: number;      // Number of zips found
  error?: string;     // Error message if failed
}
```

---

### `serviceOrderImportZip(zipPath: string)`
Extracts and imports a service order from a zip file.

**Parameters**:
- `zipPath` - Absolute path to zip file

**Returns**:
```typescript
{
  success: boolean;
  metadata?: {
    id: string;           // UUID for service
    name: string;         // Service name
    path: string;         // Extracted path
    items: ServiceItem[]; // Parsed items
    extractedAt: Date;    // Import timestamp
  };
  validation?: {
    valid: boolean;
    errors: string[];   // Critical errors
    warnings: string[]; // Non-critical warnings
  };
  error?: string;       // Error message if failed
}
```

**ServiceItem structure**:
```typescript
{
  id: string;           // UUID
  name: string;         // Clean name (no numeric prefix)
  path: string;         // Full path to item
  type: 'folder' | 'song' | 'presentation' | 'video' | 'image';
  sortOrder: number;    // Numeric order (from folder name)
}
```

---

### `serviceOrderListImported()`
Lists all imported service orders.

**Returns**:
```typescript
{
  success: boolean;
  services: ServiceOrderMetadata[];
  count: number;
  error?: string;
}
```

---

### `serviceOrderGetService(serviceId: string)`
Gets a specific service order by ID.

**Parameters**:
- `serviceId` - UUID of service

**Returns**:
```typescript
{
  success: boolean;
  service: ServiceOrderMetadata | null;
  error?: string;
}
```

---

### `serviceOrderDeleteService(serviceId: string)`
Deletes an imported service order.

**Parameters**:
- `serviceId` - UUID of service to delete

**Returns**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `serviceOrderCleanup(maxAgeDays?: number)`
Removes service orders older than specified days.

**Parameters**:
- `maxAgeDays` - Maximum age in days (default: 7)

**Returns**:
```typescript
{
  success: boolean;
  deleted: number;    // Number of services deleted
  error?: string;
}
```

## 📁 File Structure

### Expected Zip Structure
```
service-order.zip
├── 01 - Item Name/
│   └── files...
├── 02 - Another Item/
│   └── files...
└── 03 - Last Item/
    └── files...
```

**Naming Convention**:
- Folders start with numbers: `01`, `02`, `03`, etc.
- Followed by separator: `-`, `–`, or `—`
- Then item name: `Song Name`, `Sermon`, etc.
- Example: `01 - Opening Song`, `02 - Announcements`

### Extracted Location
```
~/.harmonysync/imported-service-orders/
└── {uuid}/
    ├── 01 - Item Name/
    ├── 02 - Another Item/
    └── 03 - Last Item/
```

## 🎯 Item Type Detection

| Type | File Extensions |
|------|----------------|
| **song** | .mp3, .wav, .ogg, .flac, .m4a, .aac |
| **video** | .mp4, .mov, .avi, .mkv, .webm |
| **presentation** | .pptx, .odp, .pdf, .ppt |
| **image** | .jpg, .jpeg, .png, .gif, .bmp, .svg |
| **folder** | Default (when no specific type detected) |

## ⚠️ Validation

### Errors (prevent import)
- No service items found

### Warnings (non-critical)
- First item should be "Announcements"
- No songs found
- No sermon found

## 🧪 Testing Examples

### Test in Browser Console
Open DevTools in renderer:

```javascript
// Test scan
const scan = await window.electronAPI.serviceOrderScanForZips('C:\\Users\\Admin\\Desktop');
console.log('Found:', scan.zips);

// Test import
const imp = await window.electronAPI.serviceOrderImportZip('C:\\path\\to\\service.zip');
console.log('Imported:', imp.metadata.name);
console.log('Items:', imp.metadata.items.length);
console.log('Warnings:', imp.validation.warnings);

// Test list
const list = await window.electronAPI.serviceOrderListImported();
console.log('Services:', list.services.map(s => s.name));

// Test delete
const del = await window.electronAPI.serviceOrderDeleteService(imp.metadata.id);
console.log('Deleted:', del.success);
```

### Create Test Service Order
```powershell
# Windows PowerShell
New-Item -ItemType Directory -Path "TestService\01 - Announcements"
New-Item -ItemType Directory -Path "TestService\02 - Worship"
New-Item -ItemType Directory -Path "TestService\03 - Sermon"
Compress-Archive -Path "TestService\*" -DestinationPath "test-service.zip"
```

## 🔧 Integration Snippets

### Settings Component
```typescript
const [watchFolder, setWatchFolder] = useState('');

const handleBrowse = async () => {
  const paths = await window.electronAPI.openDirectory({ multiple: false });
  if (paths && paths[0]) {
    setWatchFolder(paths[0]);
  }
};

const handleScan = async () => {
  const result = await window.electronAPI.serviceOrderScanForZips(watchFolder);
  if (result.success && result.zips.length > 0) {
    // Show import dialog
  }
};
```

### Import Dialog
```typescript
const [loading, setLoading] = useState(false);

const handleImport = async (zipPath: string) => {
  setLoading(true);
  try {
    const result = await window.electronAPI.serviceOrderImportZip(zipPath);
    if (result.success) {
      // Load into service order UI
      loadServiceOrder(result.metadata);
    }
  } finally {
    setLoading(false);
  }
};
```

### Service List
```typescript
const [services, setServices] = useState([]);

useEffect(() => {
  loadServices();
}, []);

const loadServices = async () => {
  const result = await window.electronAPI.serviceOrderListImported();
  if (result.success) {
    setServices(result.services);
  }
};

const handleDelete = async (serviceId: string) => {
  await window.electronAPI.serviceOrderDeleteService(serviceId);
  loadServices(); // Refresh list
};
```

## 🐛 Troubleshooting

### Issue: `window.electronAPI` is undefined
**Solution**: Ensure preload script is loaded:
- Check `preload.js` is in electron-app dist folder
- Verify preload path in BrowserWindow config
- Run `pnpm build` in electron-app

### Issue: Handler not found
**Solution**: Verify service is initialized:
- Check `ServiceOrderImporter` is imported in main.ts
- Verify instance passed to setupIpcHandlers
- Check IPC handler registration

### Issue: Extraction fails
**Solution**: Check zip file:
- Ensure zip is not corrupted
- Verify folder structure (numeric prefixes)
- Check disk space in `~/.harmonysync/`

### Issue: No items parsed
**Solution**: Check zip structure:
- Folders should start with numbers
- Use separator: `-`, `–`, or `—`
- Example: `01 - Item Name`

## 📚 Documentation Files

- `SERVICE_ORDER_IMPORTER_SUMMARY.md` - Complete implementation summary
- `SERVICE_ORDER_IMPORTER_IMPLEMENTATION.md` - Detailed implementation guide
- `FOLDER_SERVICE_REVISED_ARCHITECTURE.md` - Architecture redesign
- `EXAMPLE_ServiceOrderImportDialog.tsx` - Import dialog component
- `EXAMPLE_ServiceOrderSettingsPanel.tsx` - Settings panel component

## 💡 Tips

1. **Always check `success` field** in responses
2. **Display validation warnings** to users (non-critical but helpful)
3. **Show progress** during import (can be slow for large zips)
4. **Cleanup old services** periodically to save disk space
5. **Validate zip structure** before importing (check folder names)

## 🎯 Common Use Cases

### Auto-import on startup
```typescript
// In main.ts
app.whenReady().then(async () => {
  // ... create windows
  
  // Check for service orders
  const settings = await loadSettings();
  if (settings.autoImport && settings.watchFolder) {
    const result = await serviceOrderImporter.scanFolderForZips(settings.watchFolder);
    if (result.length > 0) {
      mainWindow.webContents.send('service-order-found', { zips: result });
    }
  }
});
```

### Manual import from drag-and-drop
```typescript
const handleDrop = async (e: DragEvent) => {
  const files = Array.from(e.dataTransfer.files);
  const zipFile = files.find(f => f.path.endsWith('.zip'));
  
  if (zipFile) {
    const result = await window.electronAPI.serviceOrderImportZip(zipFile.path);
    if (result.success) {
      // Load into UI
    }
  }
};
```

### Batch import multiple zips
```typescript
const importMultiple = async (zipPaths: string[]) => {
  for (const zipPath of zipPaths) {
    try {
      const result = await window.electronAPI.serviceOrderImportZip(zipPath);
      console.log(`✓ Imported: ${result.metadata.name}`);
    } catch (error) {
      console.error(`✗ Failed: ${zipPath}`, error);
    }
  }
};
```

---

**Quick Links**:
- [Full Implementation Guide](./SERVICE_ORDER_IMPORTER_IMPLEMENTATION.md)
- [Complete Summary](./SERVICE_ORDER_IMPORTER_SUMMARY.md)
- [Example Components](./EXAMPLE_ServiceOrderImportDialog.tsx)
