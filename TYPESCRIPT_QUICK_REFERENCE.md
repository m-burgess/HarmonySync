# TypeScript Electron Quick Start Guide

## ⚡ Quick Commands

```bash
# Check TypeScript types (Electron only)
npm run typecheck:electron

# Check all TypeScript (Electron + Frontend)
npm run typecheck

# Watch mode for development
npm run typecheck:electron:watch

# Install dependencies (if needed)
npm install
```

## 📚 Import Examples

### Import All Types
```typescript
import * as ElectronTypes from '@electron/types';
```

### Import Specific Types
```typescript
import { 
  IAudioService, 
  AudioMetadata, 
  SlideContent 
} from '@electron/types';
```

### Import IPC Channels
```typescript
import { 
  AudioConvertToOggChannel,
  DisplaySlideChannel 
} from '@electron/types/ipc-channels';
```

### Import Service Base Class
```typescript
import { BaseElectronService } from '@electron/types/services';
```

## 🔨 Create a New TypeScript Service

```typescript
// audio-service.ts
import { BaseElectronService, IAudioService, AudioMetadata } from '@electron/types';

export class AudioService extends BaseElectronService implements IAudioService {
  // Service name for logging
  protected readonly serviceName = 'AudioService';

  // Initialization logic
  protected async onInitialize(): Promise<void> {
    this.log('info', 'Initializing audio service...');
    // Your init code here
  }

  // Cleanup logic
  protected onDispose(): void {
    this.log('info', 'Disposing audio service...');
    // Your cleanup code here
  }

  // Service methods
  public async convertToOgg(
    inputPath: string, 
    outputDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Ensure service is initialized
    this.ensureInitialized();
    
    try {
      this.log('info', `Converting ${inputPath} to OGG...`);
      
      // Your implementation
      const outputPath = `${outputDir}/output.ogg`;
      
      // Report progress
      if (onProgress) onProgress(50);
      
      return outputPath;
      
    } catch (error) {
      // Standardized error handling
      this.handleError('convertToOgg', error);
    }
  }

  public async getMetadata(filePath: string): Promise<AudioMetadata> {
    this.ensureInitialized();
    
    try {
      // Your implementation
      return {
        duration: 180,
        bitrate: 320000,
        sampleRate: 44100,
        channels: 2,
        format: 'mp3'
      };
    } catch (error) {
      this.handleError('getMetadata', error);
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
```

## 🔌 Type-Safe IPC Handlers

```typescript
// ipc-handlers.ts
import { ipcMain } from 'electron';
import { AudioConvertToOggChannel } from '@electron/types/ipc-channels';
import { audioService } from './services/audio-service';

// Type-safe handler
ipcMain.handle(
  'audio:convertToOgg' as AudioConvertToOggChannel,
  async (event, inputPath: string, outputDir: string) => {
    return await audioService.convertToOgg(inputPath, outputDir);
  }
);
```

## 📝 Type-Safe Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Type-safe IPC invocation
  convertToOgg: (inputPath: string, outputDir: string): Promise<string> => {
    return ipcRenderer.invoke('audio:convertToOgg', inputPath, outputDir);
  },
  
  // With progress callback
  convertToOggWithProgress: (
    inputPath: string, 
    outputDir: string,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    // Listen for progress events
    ipcRenderer.on('ogg-conversion-progress', (_, progress) => {
      onProgress(progress);
    });
    
    return ipcRenderer.invoke('audio:convertToOgg', inputPath, outputDir);
  }
};

// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', api);
```

## 🎯 Type-Safe Data Models

```typescript
import { SlideContent, DisplayConfig } from '@electron/types';

// Slide content with type safety
const slide: SlideContent = {
  type: 'lyrics',
  content: 'Amazing Grace, how sweet the sound...',
  styles: {
    fontSize: '48px',
    color: '#ffffff'
  },
  background: '#000000',
  transition: 'fade'
};

// Display configuration
const displayConfig: DisplayConfig = {
  id: 'display-1',
  name: 'Main Audience Display',
  type: 'audience',
  enabled: true,
  bounds: {
    x: 1920,
    y: 0,
    width: 1920,
    height: 1080
  }
};
```

## 🧪 Type-Safe Tests

```typescript
// audio-service.test.ts
import { AudioService } from '../audio-service';
import { AudioMetadata } from '@electron/types';

describe('AudioService', () => {
  let audioService: AudioService;

  beforeEach(async () => {
    audioService = new AudioService();
    await audioService.initialize();
  });

  afterEach(() => {
    audioService.dispose();
  });

  it('should get audio metadata', async () => {
    const metadata: AudioMetadata = await audioService.getMetadata('test.mp3');
    
    expect(metadata).toHaveProperty('duration');
    expect(metadata).toHaveProperty('bitrate');
    expect(metadata.channels).toBeGreaterThan(0);
  });
});
```

## 📋 Common Patterns

### Error Handling
```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  // Logs error and re-throws
  this.handleError('operationName', error);
}
```

### Logging
```typescript
this.log('debug', 'Detailed debug info');
this.log('info', 'General information');
this.log('warn', 'Warning message');
this.log('error', 'Error message', error);
```

### Service Lifecycle
```typescript
// Initialize before use
await service.initialize();

// Check if initialized
if (service.isInitialized()) {
  // Do work
}

// Cleanup when done
service.dispose();
```

### Event Emission
```typescript
// In service
this.emit('progress', { percent: 50 });
this.emit('complete', { result: 'success' });
this.emit('error', { error: 'Something went wrong' });

// In consumer
service.on('progress', (data) => {
  console.log(`Progress: ${data.percent}%`);
});
```

## 🛠️ Available Types

### Service Interfaces
- `IService` - Base service interface
- `IAudioService` - Audio operations
- `IVideoService` - Video operations
- `IImageService` - Image operations
- `IDisplayService` - Display management
- `IWindowService` - Window management
- `IFileManager` - File operations
- `IStorageService` - Database operations
- `ISchedulerService` - Event scheduling
- `IMacroService` - Macro management
- `IScriptService` - Script execution
- And 10+ more...

### Data Models
- `AudioMetadata` - Audio file metadata
- `VideoMetadata` - Video file metadata
- `SlideContent` - Slide content structure
- `DisplayConfig` - Display configuration
- `Macro` - Macro definition
- `Script` - Script definition
- `ScheduledEvent` - Scheduled event
- `LyricsData` - Lyrics information
- `MIDIMessage` - MIDI message
- And 20+ more...

### IPC Channels
- All 80+ IPC channel types
- Grouped by domain (Dialog, File, Audio, Video, etc.)
- Type-safe channel names

## 🎓 Best Practices

### ✅ DO
- Use strict types (avoid `any`)
- Extend `BaseElectronService` for services
- Implement service interfaces
- Use `ensureInitialized()` in service methods
- Use `handleError()` for consistent error handling
- Document public methods with JSDoc
- Use union types for enums

### ❌ DON'T
- Use `any` type unless absolutely necessary
- Skip service initialization
- Throw errors without using `handleError()`
- Ignore TypeScript errors
- Mix JavaScript and TypeScript in same file
- Use `require()` in TypeScript (use `import`)

## 📖 Additional Resources

- **Full Documentation**: `electron/README_TYPESCRIPT.md`
- **Setup Summary**: `TYPESCRIPT_ELECTRON_SETUP_COMPLETE.md`
- **Type Definitions**: `electron/types/`
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

## 🎯 Need Help?

1. Check the type definition files in `electron/types/`
2. Review existing TypeScript services for examples
3. Read the comprehensive documentation
4. Run `npm run typecheck:electron` to catch errors

---

**Quick Reference Version 1.0**  
**Last Updated:** 2026-01-27
