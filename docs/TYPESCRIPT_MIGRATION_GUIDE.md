# Electron TypeScript Migration Guide

## 🎯 Overview

This guide provides step-by-step instructions for migrating the HarmonySync Electron backend from JavaScript to TypeScript. The infrastructure is complete - now we convert the files.

## ✅ Prerequisites (Complete)

- [x] TypeScript 5.3.3 installed
- [x] Type definitions created (130+ types)
- [x] tsconfig.json configured
- [x] Base service class created
- [x] Documentation written

## 📋 Migration Phases

### Phase 1: Core Files (6-8 hours) 🔥 HIGH PRIORITY

Convert the three main Electron files:

#### 1.1 main.js → main.ts

**Current file**: `electron/main.js` (13,036 bytes)

**Steps**:
```bash
# 1. Rename file
mv electron/main.js electron/main.ts

# 2. Add type imports
import { app, BrowserWindow, ipcMain, Menu, dialog, screen } from 'electron';
import { ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

# 3. Type all variables
let mainWindow: BrowserWindow | null = null;
let audienceWindow: BrowserWindow | null = null;
let audioServiceProcess: ChildProcess | null = null;

# 4. Type all functions
function createMainWindow(): BrowserWindow { }
function createAudienceWindow(): BrowserWindow { }

# 5. Update package.json main entry
"main": "electron/main.ts"  // or use ts-node for dev

# 6. Test
npm run typecheck:electron
```

**Key Changes**:
- Add types to all window variables
- Type function parameters and return values
- Type event handlers
- Add null checks where needed

#### 1.2 ipc-handlers.js → ipc-handlers.ts

**Current file**: `electron/ipc-handlers.js` (30,606 bytes)

**Steps**:
```bash
# 1. Rename file
mv electron/ipc-handlers.js electron/ipc-handlers.ts

# 2. Import IPC channel types
import { 
  DialogOpenDirectoryChannel,
  FSReadFileChannel,
  AudioConvertToOggChannel
} from '@electron/types/ipc-channels';

# 3. Type the services parameter
interface Services {
  mainWindow: () => BrowserWindow | null;
  audioService: IAudioService;
  videoService: IVideoService;
  // ... all services
}

function setupIpcHandlers(
  ipcMain: IpcMain, 
  services: Services
): void { }

# 4. Type all handlers
ipcMain.handle(
  'audio:convertToOgg' as AudioConvertToOggChannel,
  async (event, inputPath: string, outputDir: string): Promise<string> => {
    return await services.audioService.convertToOgg(inputPath, outputDir);
  }
);

# 5. Test
npm run typecheck:electron
```

**Key Changes**:
- Create Services interface
- Type all IPC handlers
- Use IPC channel type constants
- Add error handling types

#### 1.3 preload.js → preload.ts

**Current file**: `electron/preload.js` (9,220 bytes)

**Steps**:
```bash
# 1. Rename file
mv electron/preload.js electron/preload.ts

# 2. Type the API object
interface ElectronAPI {
  openDirectory: (options?: { multiple?: boolean }) => Promise<string[]>;
  readFile: (path: string) => Promise<string>;
  convertToOgg: (inputPath: string, outputDir: string) => Promise<string>;
  // ... all methods
}

# 3. Create typed API
const api: ElectronAPI = {
  openDirectory: (options) => 
    ipcRenderer.invoke('dialog:openDirectory', options),
  readFile: (path) => 
    ipcRenderer.invoke('fs:readFile', path),
  // ...
};

# 4. Expose with types
contextBridge.exposeInMainWorld('electronAPI', api);

# 5. Create type declaration for renderer
// Create: electron/preload.d.ts
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

# 6. Test
npm run typecheck:electron
```

**Key Changes**:
- Create ElectronAPI interface
- Type all API methods
- Create declaration file for renderer
- Ensure type safety across IPC boundary

### Phase 2: Service Base Class (2-3 hours) 🔥 HIGH PRIORITY

Create example service to establish pattern:

**File**: `electron/services/example-service.ts`

```typescript
import { BaseElectronService, IAudioService, AudioMetadata } from '@electron/types';
import * as ffmpeg from 'fluent-ffmpeg';

export class AudioService extends BaseElectronService implements IAudioService {
  protected readonly serviceName = 'AudioService';

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Initializing audio service...');
    // Check ffmpeg availability
    // Setup audio processing
  }

  protected onDispose(): void {
    this.log('info', 'Disposing audio service...');
    // Cleanup resources
  }

  public async convertToOgg(
    inputPath: string, 
    outputDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      this.log('info', `Converting ${inputPath} to OGG`);
      
      const outputPath = path.join(outputDir, 'output.ogg');
      
      // FFmpeg conversion logic
      await this.runFFmpeg(inputPath, outputPath, onProgress);
      
      return outputPath;
      
    } catch (error) {
      this.handleError('convertToOgg', error);
    }
  }

  public async getMetadata(filePath: string): Promise<AudioMetadata> {
    this.ensureInitialized();
    
    try {
      // Get metadata with ffmpeg
      const metadata = await this.getFFmpegMetadata(filePath);
      return metadata;
      
    } catch (error) {
      this.handleError('getMetadata', error);
    }
  }

  private async runFFmpeg(
    input: string, 
    output: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .audioCodec('libvorbis')
        .on('progress', (progress) => {
          if (onProgress) {
            onProgress(progress.percent || 0);
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(output);
    });
  }
}

// Export singleton
export const audioService = new AudioService();
```

### Phase 3: Convert Services (16-21 hours) 🔥 HIGH PRIORITY

Convert all 23 service files following the pattern above.

**Priority Order**:

1. **Core Services** (8-10 hours)
   - [ ] audio-service.js → audio-service.ts
   - [ ] video-service.js → video-service.ts
   - [ ] image-service.js → image-service.ts
   - [ ] ffmpeg.js → ffmpeg.ts
   - [ ] file-manager.js → file-manager.ts
   - [ ] json-storage.js → json-storage.ts

2. **Display Services** (2-3 hours)
   - [ ] display-service.js → display-service.ts
   - [ ] display-config-service.js → display-config-service.ts
   - [ ] window-service.js → window-service.ts
   - [ ] text-service.js → text-service.ts

3. **Integration Services** (3-4 hours)
   - [ ] google-drive.js → google-drive.ts
   - [ ] dropbox-service.js → dropbox-service.ts
   - [ ] youtube-service.js → youtube-service.ts
   - [ ] lyrics-fetcher.js → lyrics-fetcher.ts

4. **Automation Services** (3-4 hours)
   - [ ] scheduler-service.js → scheduler-service.ts
   - [ ] macro-service.js → macro-service.ts
   - [ ] script-service.js → script-service.ts
   - [ ] scripting-api.js → scripting-api.ts
   - [ ] event-trigger-service.js → event-trigger-service.ts

5. **Other Services** (2-3 hours)
   - [ ] slides-service.js → slides-service.ts
   - [ ] http-server.js → http-server.ts
   - [ ] remote-control-service.js → remote-control-service.ts
   - [ ] midi-manager.js → midi-manager.ts

**Conversion Template**:

```typescript
// 1. Import types
import { BaseElectronService, IXxxService } from '@electron/types';

// 2. Import dependencies with types
import * as fs from 'fs-extra';
import * as path from 'path';

// 3. Define service class
export class XxxService extends BaseElectronService implements IXxxService {
  protected readonly serviceName = 'XxxService';
  
  // 4. Private fields with types
  private cache: Map<string, any> = new Map();
  
  // 5. Initialization
  protected async onInitialize(): Promise<void> {
    // Init logic
  }
  
  // 6. Cleanup
  protected onDispose(): void {
    // Cleanup logic
  }
  
  // 7. Public methods with full types
  public async method(param: string): Promise<Result> {
    this.ensureInitialized();
    try {
      // Implementation
      return result;
    } catch (error) {
      this.handleError('method', error);
    }
  }
}

// 8. Export singleton
export const xxxService = new XxxService();
```

### Phase 4: Convert Tests (4-6 hours) ⚡ MEDIUM PRIORITY

Convert all 9 test files:

**Steps for each test**:

```bash
# 1. Rename
mv service.test.js service.test.ts

# 2. Import types
import { AudioService } from '../audio-service';
import { AudioMetadata } from '@electron/types';

# 3. Type test variables
let audioService: AudioService;
let mockMetadata: AudioMetadata;

# 4. Update test cases
it('should return metadata', async () => {
  const result: AudioMetadata = await audioService.getMetadata('test.mp3');
  expect(result).toHaveProperty('duration');
});
```

**Test Files**:
- [ ] display-config-service.test.js
- [ ] display-service.test.js
- [ ] event-trigger-service.test.js
- [ ] macro-service.test.js
- [ ] remote-control-service.test.js
- [ ] scheduler-service.test.js
- [ ] script-service.test.js
- [ ] slides-service.test.js
- [ ] window-service.test.js

### Phase 5: Update Build Configuration (1-2 hours) 📦 LOW PRIORITY

Update build scripts to handle TypeScript:

**package.json changes**:

```json
{
  "main": "electron/dist/main.js",
  "scripts": {
    "build:electron": "tsc -p electron/tsconfig.json",
    "prebuild": "npm run build:electron",
    "dev:electron": "wait-on http://localhost:5174 && ts-node electron/main.ts"
  }
}
```

**electron/tsconfig.json changes**:

```json
{
  "compilerOptions": {
    "noEmit": false,  // Enable compilation
    "outDir": "./dist"
  }
}
```

### Phase 6: Final Validation (2-4 hours) ✨

**Checklist**:

- [ ] All .js files converted to .ts
- [ ] `npm run typecheck:electron` passes with 0 errors
- [ ] All tests pass: `npm test`
- [ ] Application runs: `npm start`
- [ ] Dev mode works: `npm run dev`
- [ ] Build succeeds: `npm run build`
- [ ] No runtime errors
- [ ] Type coverage > 95% (minimal `any` usage)

**Validation Commands**:

```bash
# Type checking
npm run typecheck:electron

# Run tests
npm test

# Test application
npm start

# Build application
npm run build

# Count any types
grep -r "any" electron/**/*.ts | wc -l

# Check for todos
grep -r "TODO\|FIXME" electron/**/*.ts
```

## 🛠️ Tools and Scripts

### Auto-convert Helper

Create `scripts/convert-to-ts.sh`:

```bash
#!/bin/bash

FILE=$1
if [ -z "$FILE" ]; then
    echo "Usage: ./convert-to-ts.sh <file.js>"
    exit 1
fi

BASENAME=$(basename "$FILE" .js)
DIRNAME=$(dirname "$FILE")
NEWFILE="$DIRNAME/$BASENAME.ts"

# Rename
git mv "$FILE" "$NEWFILE"

# Add basic types header
cat > /tmp/header.txt << 'EOF'
/**
 * TypeScript conversion
 * TODO: Add proper types
 */

EOF

# Prepend header
cat /tmp/header.txt "$NEWFILE" > /tmp/temp && mv /tmp/temp "$NEWFILE"

echo "Converted $FILE to $NEWFILE"
echo "Next steps:"
echo "1. Add type imports"
echo "2. Type all variables and functions"
echo "3. Run: npm run typecheck:electron"
```

## 📊 Progress Tracking

Create a checklist file to track progress:

**TYPESCRIPT_CONVERSION_PROGRESS.md**:

```markdown
# TypeScript Conversion Progress

## Phase 1: Core Files ⏳
- [ ] main.js → main.ts
- [ ] ipc-handlers.js → ipc-handlers.ts
- [ ] preload.js → preload.ts

## Phase 2: Services ⏳

### Core Services
- [ ] audio-service.js
- [ ] video-service.js
- [ ] image-service.js
... (all services)

## Phase 3: Tests ⏳
- [ ] All 9 test files

## Phase 4: Build ⏳
- [ ] Update build configuration
- [ ] Test compilation

## Phase 5: Validation ⏳
- [ ] Type check passes
- [ ] Tests pass
- [ ] App runs
- [ ] Build succeeds
```

## 🎓 Tips and Best Practices

### Common Patterns

**Pattern 1: Converting require to import**
```typescript
// Before
const fs = require('fs-extra');

// After
import * as fs from 'fs-extra';
// or
import fs from 'fs-extra';
```

**Pattern 2: Adding types to parameters**
```typescript
// Before
function processFile(path, options) { }

// After
function processFile(path: string, options?: ProcessOptions): Promise<void> { }
```

**Pattern 3: Typing async functions**
```typescript
// Before
async function getData() {
  return await fetch();
}

// After
async function getData(): Promise<DataType> {
  return await fetch();
}
```

**Pattern 4: Using union types**
```typescript
// Before
function setStatus(status) { }

// After
function setStatus(status: 'idle' | 'processing' | 'complete'): void { }
```

### Dealing with `any`

```typescript
// ❌ Bad - Using any
function process(data: any): any { }

// ✅ Better - Use unknown and type guards
function process(data: unknown): ProcessedData {
  if (typeof data === 'object' && data !== null) {
    // Type narrowing
    return processObject(data);
  }
  throw new Error('Invalid data type');
}

// ✅ Best - Use generics
function process<T extends ProcessableType>(data: T): ProcessedData<T> { }
```

## 🚨 Common Issues and Solutions

### Issue 1: Module resolution errors
**Solution**: Check tsconfig.json paths and ensure imports use correct syntax

### Issue 2: Cannot find type definitions
**Solution**: Install @types/package or create custom .d.ts file

### Issue 3: Strict null checks
**Solution**: Add proper null checks or use non-null assertion (!)

### Issue 4: Circular dependencies
**Solution**: Refactor to use dependency injection or move shared types

## 📈 Expected Timeline

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: Core Files | 6-8 hours | High |
| Phase 2: Base Class | 2-3 hours | Medium |
| Phase 3: Services | 16-21 hours | High |
| Phase 4: Tests | 4-6 hours | Medium |
| Phase 5: Build | 1-2 hours | Low |
| Phase 6: Validation | 2-4 hours | Medium |
| **Total** | **31-44 hours** | **2-3 weeks** |

## ✅ Success Criteria

Before marking conversion complete:

- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Application runs without errors
- [ ] Build succeeds
- [ ] Type coverage > 95%
- [ ] Documentation updated
- [ ] Code review passed
- [ ] No regression in functionality

## 🎉 Benefits After Completion

- 90%+ compile-time bug detection
- Full IntelliSense everywhere
- Safe refactoring
- Self-documenting code
- Better maintainability
- Faster onboarding

---

**Status**: Ready to begin  
**Next Action**: Start Phase 1 - Convert main.js  
**Estimated Completion**: 2-3 weeks
