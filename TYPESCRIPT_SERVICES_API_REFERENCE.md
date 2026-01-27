# TypeScript Services API Quick Reference

## File Manager Service

### Import
```typescript
import { FileManagerService, getFileManagerService } from './services/file-manager';
```

### Usage
```typescript
const fileManager = getFileManagerService();
await fileManager.initialize();

// Read file
const content = await fileManager.readFile('/path/to/file.txt');

// Write file
await fileManager.writeFile('/path/to/file.txt', 'content');

// Read directory (names only)
const files = await fileManager.readDir('/path/to/dir');

// Read directory (detailed info)
const entries = await fileManager.readDirDetailed('/path/to/dir');

// Check existence
const exists = await fileManager.exists('/path/to/file');

// Create directory
await fileManager.mkdir('/path/to/dir');

// Copy file
await fileManager.copyFile('/src/file', '/dest/file');

// Delete file
await fileManager.deleteFile('/path/to/file');

// Move/rename file
await fileManager.moveFile('/old/path', '/new/path');

// Generate background CSS
const css = await fileManager.generateBackgroundCss('/path/to/dir', {
  colors: [{ r: 100, g: 150, b: 200 }],
  animationDuration: 15
});
```

---

## JSON Storage Service

### Import
```typescript
import { JSONStorageService, getJSONStorageService } from './services/json-storage';
import { ScheduledEvent, Macro } from '../types/models';
```

### Usage
```typescript
const storage = getJSONStorageService();
await storage.initialize();

// === Scheduled Events ===
const events = await storage.getAllScheduledEvents();
const event = await storage.getScheduledEventById('123');
const newEvent = await storage.createScheduledEvent({
  title: 'Sunday Service',
  startTime: new Date().toISOString(),
  type: 'service'
});
await storage.updateScheduledEvent({ id: '123', title: 'Updated' });
await storage.deleteScheduledEvent('123');
const today = await storage.getTodayEvents();
const upcoming = await storage.getUpcomingEvents(24); // next 24 hours

// === Macros ===
const macros = await storage.getAllMacros();
const macro = await storage.getMacroById('456');
const newMacro = await storage.createMacro({
  name: 'Quick Setup',
  actions: [{ type: 'display', command: 'show', params: {} }]
});
await storage.updateMacro({ id: '456', name: 'Updated' });
await storage.deleteMacro('456');

// === Settings ===
const setting = await storage.getSetting('theme');
await storage.setSetting('theme', 'dark');
const allSettings = await storage.getAllSettings();

// === Google Drive Sync ===
const syncConfig = await storage.getGDriveSyncConfig();
await storage.addGDriveSyncFolder('folder-id', '/local/path');
await storage.updateGDriveSyncStatus('folder-id', new Date().toISOString());
await storage.removeGDriveSyncFolder('folder-id');

// === YouTube Links ===
const link = await storage.addYouTubeLink('/presentation/path', 'https://youtube.com/...');
const links = await storage.getYouTubeLinks('/presentation/path');
await storage.deleteYouTubeLink('/presentation/path', 'https://youtube.com/...');

// === Song Metadata ===
const metadata = await storage.getSongMetadata('/song/path');
await storage.saveSongMetadata('/song/path', { key: 'value' });
```

---

## Display Service

### Import
```typescript
import { DisplayService } from './services/display-service';
import { SlideContent, LowerThirdsData } from '../types/models';
```

### Usage
```typescript
// Create service with window getters
const displayService = new DisplayService(
  () => audienceWindow,
  () => confidenceWindow,
  () => lowerThirdsWindow
);
await displayService.initialize();

// Display video slide
await displayService.displayVideoSlide('/path/to/video.mp4', 180);

// Display slide content
const slide: SlideContent = {
  type: 'text',
  content: 'Hello World',
  styles: { fontSize: '48px' }
};
await displayService.displaySlide(slide);

// Black screen
await displayService.blackScreen();

// Clear all displays
await displayService.clearAll();

// Update lower thirds
const lowerThirds: LowerThirdsData = {
  visible: true,
  name: 'John Doe',
  title: 'Senior Pastor',
  position: 'bottom'
};
await displayService.updateLowerThirds(lowerThirds);

// Send to specific display
await displayService.sendToDisplay('audience', 'custom-event', { data: 'value' });

// Broadcast to all
await displayService.broadcast('sync-state', { playing: true });

// Check window availability
const isAvailable = displayService.isWindowAvailable('audience');
const count = displayService.getAvailableWindowsCount();

// Listen to events
displayService.on('video-displayed', (data) => {
  console.log('Video displayed:', data);
});
```

---

## Display Config Service

### Import
```typescript
import { DisplayConfigService, getDisplayConfigService } from './services/display-config-service';
import { DisplayConfig } from '../types/models';
```

### Usage
```typescript
const configService = getDisplayConfigService();
await configService.initialize();

// Get all configs
const configs = await configService.getAll();

// Get specific config
const config = await configService.get('audience');

// Get enabled configs
const enabled = await configService.getEnabled();

// Create config
const newId = await configService.create({
  name: 'Custom Display',
  type: 'custom',
  enabled: true,
  settings: { deviceId: 'screen-1' }
});

// Update config
await configService.update('audience', {
  enabled: false,
  settings: { brightness: 80 }
});

// Delete config
await configService.delete('custom-display-123');

// Reorder configs
await configService.reorder(['audience', 'confidence', 'lower-thirds']);

// Enable/disable
await configService.enable('audience');
await configService.disable('confidence');

// Reset to defaults
await configService.resetToDefaults();

// Get by type
const audienceConfigs = await configService.getByType('audience');

// Check existence
const exists = await configService.exists('audience');

// Get counts
const total = configService.getCount();
const enabledCount = configService.getEnabledCount();

// Listen to events
configService.on('config-created', (config) => {
  console.log('Config created:', config);
});

configService.on('configs-saved', (configs) => {
  console.log('Configs saved:', configs);
});
```

---

## Common Patterns

### Service Lifecycle
```typescript
const service = getServiceSingleton();

// Initialize before use
await service.initialize();

// Use service...

// Clean up when done
service.dispose();
```

### Error Handling
```typescript
try {
  await service.someOperation();
} catch (error) {
  console.error('Operation failed:', error);
}

// Or listen to error events
service.on('error', ({ operation, error }) => {
  console.error(`Error in ${operation}:`, error);
});
```

### Event Listening
```typescript
service.on('initialized', () => {
  console.log('Service ready');
});

service.on('error', ({ operation, error }) => {
  console.error(`Error in ${operation}:`, error);
});

// Service-specific events
displayService.on('video-displayed', (data) => {});
configService.on('config-created', (config) => {});
```

### Configuration
```typescript
const service = new ServiceClass({
  enabled: true,
  logLevel: 'debug' // 'debug' | 'info' | 'warn' | 'error'
});
```

---

## Type Definitions Reference

### DisplayConfig
```typescript
interface DisplayConfig {
  id: string;
  name: string;
  type: 'audience' | 'confidence' | 'lowerthirds' | 'custom';
  enabled: boolean;
  displayId?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings?: Record<string, any>;
  order?: number;
}
```

### SlideContent
```typescript
interface SlideContent {
  type: 'text' | 'image' | 'video' | 'html' | 'lyrics';
  content: string;
  styles?: Record<string, string>;
  background?: string;
  transition?: string;
  duration?: number;
}
```

### ScheduledEvent
```typescript
interface ScheduledEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string | Date;
  endTime?: string | Date;
  type: 'service' | 'rehearsal' | 'special' | 'other';
  actions?: EventAction[];
  repeat?: RepeatConfig;
  reminders?: ReminderConfig[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
```

### Macro
```typescript
interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
  hotkey?: string;
  enabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
```

See `electron/types/models.ts` for complete type definitions.
