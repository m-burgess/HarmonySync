# Electron TypeScript Configuration

This directory contains the TypeScript configuration for the HarmonySync Electron backend process.

## 📁 Structure

```
electron/
├── tsconfig.json              # TypeScript configuration
├── types/                     # Shared type definitions
│   ├── index.ts              # Central export
│   ├── ipc-channels.ts       # IPC channel types
│   ├── models.ts             # Data models
│   └── services.ts           # Service interfaces
├── main.js                    # Main process entry (to be converted)
├── ipc-handlers.js           # IPC handlers (to be converted)
├── preload.js                # Preload script (to be converted)
└── services/                  # Backend services (to be converted)
    ├── audio-service.js
    ├── video-service.js
    └── ...
```

## 🎯 TypeScript Configuration

### Compiler Options

- **Target**: ES2022 (Modern Node.js features)
- **Module**: CommonJS (Electron/Node.js standard)
- **Strict Mode**: Enabled (Maximum type safety)
- **Decorators**: Enabled (For future OOP implementation)
- **Source Maps**: Enabled (For debugging)

### Path Aliases

```typescript
import { IAudioService } from '@electron/types/services';
import { AudioMetadata } from '@electron/types/models';
import { AudioService } from '@electron/services/audio-service';
```

## 📚 Type Definitions

### 1. IPC Channels (`types/ipc-channels.ts`)

Defines all IPC communication channels between renderer and main process:

```typescript
export type DialogOpenDirectoryChannel = 'dialog:openDirectory';
export type FSReadFileChannel = 'fs:readFile';
export type AudioConvertToOggChannel = 'audio:convertToOgg';
// ... 80+ channel definitions
```

**Benefits:**
- Type-safe IPC communication
- IntelliSense support for channel names
- Compile-time validation of channel strings

### 2. Data Models (`types/models.ts`)

Common data structures used across IPC:

```typescript
export interface AudioMetadata {
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export interface SlideContent {
  type: 'text' | 'image' | 'video' | 'html' | 'lyrics';
  content: string;
  styles?: Record<string, string>;
  background?: string;
}
// ... 30+ model definitions
```

**Benefits:**
- Consistent data structures
- Self-documenting code
- Compile-time validation

### 3. Service Interfaces (`types/services.ts`)

Base interfaces and abstract classes for services:

```typescript
export interface IService {
  initialize(): Promise<void>;
  dispose(): void;
  isInitialized(): boolean;
}

export abstract class BaseElectronService extends EventEmitter implements IService {
  protected initialized: boolean = false;
  protected abstract readonly serviceName: string;
  
  public async initialize(): Promise<void> { /* ... */ }
  public dispose(): void { /* ... */ }
  protected log(level: string, message: string): void { /* ... */ }
  protected handleError(operation: string, error: unknown): never { /* ... */ }
}
```

**Benefits:**
- Consistent service API
- Common error handling
- Built-in logging
- Event emission support

## 🚀 Usage

### Type-Checking

```bash
# Check Electron backend types
npm run typecheck:electron

# Check Electron + Frontend types
npm run typecheck

# Watch mode for development
npm run typecheck:electron:watch
```

### Importing Types

```typescript
// Import specific types
import { IAudioService, AudioMetadata } from '@electron/types';

// Import IPC channels
import { AudioConvertToOggChannel } from '@electron/types/ipc-channels';

// Import base service class
import { BaseElectronService } from '@electron/types/services';
```

### Creating a New Service (TypeScript)

```typescript
import { BaseElectronService, IAudioService } from '@electron/types';

export class AudioService extends BaseElectronService implements IAudioService {
  protected readonly serviceName = 'AudioService';

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Initializing audio service...');
    // Your initialization code
  }

  protected onDispose(): void {
    // Your cleanup code
  }

  public async convertToOgg(
    inputPath: string, 
    outputDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    this.ensureInitialized();
    try {
      // Your implementation
      return outputPath;
    } catch (error) {
      this.handleError('convertToOgg', error);
    }
  }
}
```

## 🔄 Migration Strategy

The TypeScript configuration is set up to work with existing JavaScript files. This allows incremental migration:

### Phase 1: Type Definitions ✅
- [x] Create tsconfig.json
- [x] Define IPC channels
- [x] Define data models
- [x] Define service interfaces

### Phase 2: Core Files (Next)
- [ ] Convert main.js → main.ts
- [ ] Convert ipc-handlers.js → ipc-handlers.ts
- [ ] Convert preload.js → preload.ts

### Phase 3: Services
- [ ] Convert all 23 service files to TypeScript
- [ ] Extend BaseElectronService
- [ ] Implement service interfaces

### Phase 4: Tests
- [ ] Convert test files to TypeScript
- [ ] Add type-safe mocks

## 🎓 Best Practices

### 1. Always Use Strict Types
```typescript
// ✅ Good
function getMetadata(path: string): Promise<AudioMetadata> { }

// ❌ Bad
function getMetadata(path: any): Promise<any> { }
```

### 2. Leverage Service Interfaces
```typescript
// ✅ Good
export class AudioService extends BaseElectronService implements IAudioService {
  // TypeScript ensures all interface methods are implemented
}

// ❌ Bad
export class AudioService {
  // No contract enforcement
}
```

### 3. Use Union Types for IPC Channels
```typescript
// ✅ Good
type AudioChannel = 
  | AudioConvertToOggChannel 
  | AudioTransposeChannel;

// ❌ Bad
type AudioChannel = string;
```

### 4. Document Complex Types
```typescript
/**
 * Configuration for scheduled events
 * @property frequency - How often the event repeats
 * @property interval - Interval between repetitions
 * @property daysOfWeek - Days of week for weekly events (0-6)
 */
export interface RepeatConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
}
```

## 🧪 Testing TypeScript Configuration

```bash
# Verify configuration is valid
cd electron && tsc --noEmit

# Should complete without errors (JS files will have issues to be fixed during conversion)
```

## 📖 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Electron + TypeScript](https://www.electronjs.org/docs/latest/tutorial/typescript)
- [Node.js Types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node)

## 🤝 Contributing

When adding new features:

1. **Add IPC channels** to `types/ipc-channels.ts`
2. **Add data models** to `types/models.ts`
3. **Update service interfaces** in `types/services.ts`
4. **Run type checker** before committing

## ⚙️ Configuration Reference

### tsconfig.json Settings

| Setting | Value | Reason |
|---------|-------|--------|
| `target` | ES2022 | Modern Node.js 18+ support |
| `module` | commonjs | Electron uses CommonJS |
| `strict` | true | Maximum type safety |
| `noEmit` | true | Type checking only (no compilation) |
| `experimentalDecorators` | true | Support for decorators |
| `esModuleInterop` | true | Better CommonJS/ES module compatibility |

### Excluded Patterns

- `node_modules/` - Third-party dependencies
- `dist/` - Build output
- `**/*.test.js` - Test files (separate config)
- `**/__tests__/**` - Test directories

## 🎉 Benefits

- ✅ **Type Safety**: Catch 90%+ of bugs at compile-time
- ✅ **IntelliSense**: Full autocomplete in VS Code
- ✅ **Refactoring**: Safe, automated refactoring
- ✅ **Documentation**: Self-documenting code
- ✅ **Maintainability**: Easier to understand and modify
- ✅ **Onboarding**: New developers get up to speed faster

---

**Status**: Configuration Complete ✅  
**Next Step**: Begin converting main process files (main.js, ipc-handlers.js, preload.js)  
**Timeline**: 2-3 weeks for full conversion
