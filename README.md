# HarmonySync

Modern worship presentation software with multitrack audio, DMX lighting control, and media display capabilities.

**This is a Test-Driven Development (TDD) Application** - All new features and changes should be developed with comprehensive tests to ensure reliability and maintainability.

## Project Structure

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces). The repository is organized as follows:

```
├── apps/                           # Application packages
│   ├── electron-app/              # Main desktop app (Electron)
│   ├── renderer/                  # React UI renderer
│   ├── harmonysync-audio-service/ # Audio processing microservice
│   ├── harmonysync-image-service/ # Image processing microservice
│   ├── harmonysync-video-service/ # Video processing microservice
│   ├── control-app/               # Mobile/remote control interface
│   └── mobile-app/                # Mobile application
│
├── packages/                      # Shared packages
│   ├── core/                      # Core types and interfaces
│   ├── shared-logic/              # Business logic and utilities
│   └── ui/                        # UI components and styling
│
└── docs/                          # Documentation
```

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- pnpm (v8 or later)

### Installation

```bash
# Install pnpm globally if you haven't already
npm install -g pnpm

# Install all dependencies across all workspace packages
pnpm install
```

### Development

```bash
# Run all apps and packages in development mode
pnpm dev

# Build all packages
pnpm build

# Run type checking across all packages
pnpm typecheck

# Run tests across all packages
pnpm test
```

### Working with Individual Packages

You can run commands in specific workspaces using pnpm's filtering:

```bash
# Run dev mode for a specific app
pnpm --filter @harmonysync/electron-app dev

# Build a specific package
pnpm --filter @harmonysync/renderer build

# Run tests for a specific app
pnpm --filter @harmonysync/audio-service test
```

## Architecture

HarmonySync uses a microservices architecture:

- **Electron App**: Main desktop application built with Electron
- **Renderer**: React-based UI for presentation views
- **Microservices**: Separate services for audio, image, and video processing
- **Shared Packages**: Common types, logic, and components shared across apps

## Documentation

Comprehensive documentation can be found in the `docs/` directory:

- [Architecture Analysis](docs/ARCHITECTURE_ANALYSIS.md)
- [MVVM Quick Reference](docs/MVVM_QUICK_REFERENCE.md)
- [TypeScript Migration Guide](docs/TYPESCRIPT_MIGRATION_GUIDE.md)
- [Service Architecture](docs/SERVICE_ARCHITECTURE.md)

## License

MIT License - see [docs/LICENSE](docs/LICENSE) for details

## Contributing

This is a monorepo structure. When making changes:

1. Make changes in the appropriate `apps/` or `packages/` directory
2. Run `pnpm typecheck` to verify type safety
3. Run `pnpm test` to ensure tests pass
4. Use workspace dependencies with `workspace:*` protocol in package.json files

## Developer Guide

### How to Add a New Feature with Feature Service

When adding a new feature that requires a service, follow this checklist:

#### 1. **Create the Service Class** (Backend - Electron Main Process)
   - Location: `apps/electron-app/electron/services/`
   - Extend `BaseElectronService` from `@harmonysync/core`
   - Implement the service interface in `apps/electron-app/types/services.ts`
   - Example structure:
     ```typescript
     export class MyFeatureService extends BaseElectronService implements IMyFeatureService {
       protected readonly serviceName = 'MyFeatureService';
       
       protected override async onInitialize(): Promise<void> {
         // Initialize your service
       }
       
       protected override onDispose(): void {
         // Clean up resources
       }
       
       // Add your service methods here
       public async doSomething(): Promise<void> {
         this.ensureInitialized();
         // Implementation
       }
     }
     ```

#### 2. **Register Service in Main Process**
   - Location: `apps/electron-app/electron/main.ts`
   - Import and initialize your service
   - Register IPC handlers if needed for frontend communication

#### 3. **Add Service Interface to Core Types**
   - Location: `packages/core/src/types/services.ts`
   - Define the interface that your service implements
   - Export types needed by both frontend and backend

#### 4. **Create Frontend Service Adapter** (if UI interaction is needed)
   - Location: `apps/renderer/src/services/`
   - Create a service wrapper that uses IPC to communicate with the Electron service
   - Inject into the DI container in `apps/renderer/src/di/`

#### 5. **Create ViewModel** (if UI is needed)
   - Location: `apps/renderer/src/viewmodels/`
   - Create a ViewModel that uses the frontend service
   - Follow MVVM pattern - see `docs/MVVM_QUICK_REFERENCE.md`

#### 6. **Create React Component/View**
   - Location: `apps/renderer/src/views/` or `apps/renderer/src/components/`
   - Use the ViewModel via dependency injection
   - Keep views as thin as possible - logic belongs in ViewModels

#### 7. **Add JSON Storage** (if data persistence is needed)
   - Use `JSONStorageService` from `apps/electron-app/electron/services/json-storage.ts`
   - Add methods to save/load your feature's data
   - Data is stored in JSON files in the user data directory

#### 8. **Write Tests** (Required - TDD Approach)
   - See "How to Create a Test for a New Feature" section below

### How to Create a Test for a New Feature

HarmonySync uses a comprehensive testing framework. Tests should be written BEFORE or ALONGSIDE implementation (TDD).

#### Test Location
- **Service Tests (Backend)**: `apps/testing/utils/electron-tests/__tests__/your-service.test.ts`
  - Replace `your-service` with your actual service name, e.g., `audio-service.test.ts`
- **Integration Tests**: `apps/testing/utils/test-utils/__tests__/__tests__/integration/`
  - Note: The nested `__tests__/__tests__/` structure is intentional in this repository
- **ViewModel Tests**: `apps/testing/utils/test-utils/__tests__/__tests__/viewmodels/`
- **Example/Tutorial Tests**: `apps/testing/utils/test-utils/__tests__/example-service.test.ts`

#### Writing a Service Test

1. **Use Testing Utilities**
   ```typescript
   import {
     createTestServiceContext,
     setupTestFileSystem,
     createTestDirectoryStructure,
     waitForEvent,
     captureEvents
   } from '../test-helpers';
   import { MockFileSystem, MockLogger, MockEventBus } from '../../types/testing';
   ```

2. **Set Up Test Context**
   ```typescript
   describe('MyFeatureService', () => {
     let context: IServiceContext;
     let service: MyFeatureService;

     beforeEach(() => {
       context = createTestServiceContext();
       service = new MyFeatureService(context);
       setupTestFileSystem(context.fileSystem as MockFileSystem);
     });

     afterEach(() => {
       service.dispose();
       (context.fileSystem as MockFileSystem).clear();
     });
   ```

3. **Write Test Cases**
   - Test initialization
   - Test each public method
   - Test error conditions
   - Test events and logging
   - Test file system operations (using mock)
   - Test HTTP operations (using mock)

4. **Run Tests**
   ```bash
   # Run all tests
   pnpm test

   # Run specific test file
   pnpm --filter @harmonysync/testing test your-service.test.ts

   # Run tests in watch mode
   pnpm --filter @harmonysync/testing test --watch
   ```

#### Example Test Pattern
See `apps/testing/utils/test-utils/__tests__/example-service.test.ts` for a comprehensive tutorial demonstrating:
- Service initialization patterns
- File system mocking
- Event capture and verification
- HTTP mocking
- Complex workflow testing

#### Testing Best Practices
- **Mock External Dependencies**: Use the provided mocks for file system, logger, event bus, HTTP client
- **Test Isolation**: Each test should be independent and not rely on other tests
- **Descriptive Test Names**: Use clear, descriptive test names that explain what is being tested
- **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification phases
- **Edge Cases**: Test error conditions, edge cases, and boundary conditions
- **Integration Tests**: For complex workflows, write integration tests that test multiple services together

### How to Work on Frontend Fixes

The frontend uses React with TypeScript following the MVVM (Model-View-ViewModel) pattern.

#### Frontend Architecture
- **Location**: `apps/renderer/src/`
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **State Management**: ViewModels with MobX (observable pattern)
- **DI**: Custom dependency injection container

#### Making Frontend Changes

1. **Identify the Component**
   - Main views: `apps/renderer/src/views/`
   - Reusable components: `apps/renderer/src/components/`
   - Entry points: `apps/renderer/src/*-main.tsx` (e.g., `main.tsx`, `audience-main.tsx`)

2. **Understand the ViewModel**
   - ViewModels: `apps/renderer/src/viewmodels/`
   - ViewModels contain business logic and state
   - Views should only handle presentation and user interaction
   - **Rule**: If logic is in the View, move it to the ViewModel

3. **Follow MVVM Pattern**
   - **View**: React component (JSX/TSX)
     - Observes ViewModel state
     - Calls ViewModel methods on user actions
     - Minimal logic - only UI-related
   - **ViewModel**: Business logic and state
     - Contains observable state
     - Methods for user actions
     - Communicates with services
   - **Model**: Services and data structures
     - Backend services (via IPC)
     - Local state management

4. **Using Services in Frontend**
   - Services are injected via DI container
   - Frontend services are adapters that use Electron IPC
   - Example:
     ```typescript
     constructor(
       @inject('AudioService') private audioService: IAudioService
     ) {}
     ```

5. **Styling with TailwindCSS**
   - Use Tailwind utility classes
   - Custom styles: `apps/renderer/src/styles/`
   - Config: `apps/renderer/tailwind.config.cjs`

6. **Testing Frontend Changes**
   ```bash
   # Run dev server with hot reload
   pnpm --filter @harmonysync/renderer dev

   # Type check
   pnpm --filter @harmonysync/renderer typecheck

   # Build for production
   pnpm --filter @harmonysync/renderer build
   ```

7. **Common Frontend Tasks**
   - **Fix UI Bug**: Locate component → Check ViewModel logic → Fix in appropriate layer
   - **Add UI Element**: Add to View → Add interaction methods to ViewModel → Connect to services if needed
   - **Style Update**: Modify Tailwind classes or add custom CSS
   - **Add State**: Add to ViewModel as observable property

#### Frontend Resources
- MVVM Pattern: `docs/MVVM_QUICK_REFERENCE.md`
- Component Hierarchy: `docs/COMPONENT_HIERARCHY.md`
- Testing Guide: `docs/TESTING_GUIDE.md`

### How to Work on Backend Fixes

The backend consists of Electron main process services and separate microservices.

#### Backend Architecture
- **Main Process Services**: `apps/electron-app/electron/services/`
- **Microservices**: 
  - Audio: `apps/harmonysync-audio-service/` (Port: 3001)
  - Image: `apps/harmonysync-image-service/` (Port: 3003)
  - Video: `apps/harmonysync-video-service/` (Port: 3002)
  - Folder: `apps/harmonysync-folder-service/`

#### Service Types

**In-Process Services** (Lightweight operations)
- Run in Electron main process
- Fast operations, metadata, coordination
- Examples: `scheduler-service.ts`, `macro-service.ts`, `display-service.ts`

**Microservices** (CPU/Memory intensive)
- Run as separate Node.js processes
- Heavy processing (audio mixing, video transcoding, image processing)
- Communicate via HTTP REST API and Socket.IO
- See `docs/SERVICE_ARCHITECTURE.md` for details

#### Making Backend Changes

1. **Identify Service Type**
   - In-process: `apps/electron-app/electron/services/`
   - Microservice: `apps/harmonysync-*-service/`

2. **Service Structure**
   - All services extend `BaseElectronService`
   - Implement `onInitialize()` and `onDispose()` lifecycle methods
   - Use `this.ensureInitialized()` before operations
   - Log with `this.log(level, message, ...args)`

3. **Common Backend Tasks**
   - **Fix Service Bug**: Locate service → Add test case → Fix logic → Verify tests pass
   - **Add Service Method**: Add to service interface → Implement method → Add IPC handler if needed → Write tests
   - **Optimize Performance**: Profile → Identify bottleneck → Consider moving to microservice if CPU-intensive
   - **Fix Memory Leak**: Use `onDispose()` to clean up resources → Verify cleanup in tests

4. **IPC Communication**
   - Frontend to Backend: Use `ipcRenderer.invoke()` and `ipcMain.handle()`
   - Defined in: `apps/electron-app/electron/main.ts`
   - Keep IPC handlers thin - delegate to services

5. **Testing Backend Services**
   ```bash
   # Run service tests
   pnpm --filter @harmonysync/testing test

   # Run specific service test
   pnpm --filter @harmonysync/testing test audio-service.test.ts

   # Test main process
   pnpm --filter @harmonysync/electron-app typecheck
   ```

6. **Microservice Development**
   ```bash
   # Run microservice in dev mode
   pnpm --filter @harmonysync/audio-service dev

   # Test microservice
   pnpm --filter @harmonysync/audio-service test

   # Microservices expose REST API and Socket.IO
   # Ports: Audio:3001, Video:3002, Image:3003
   ```

#### Backend Resources
- Service Architecture: `docs/SERVICE_ARCHITECTURE.md`
- TypeScript Migration: `docs/TYPESCRIPT_MIGRATION_GUIDE.md`
- Testing Guide: `docs/TESTING_ABSTRACTIONS_GUIDE.md`

### How to Work on JSON Storage Fixes

HarmonySync uses JSON files for all data persistence (replaced SQLite).

#### JSON Storage Service
- **Location**: `apps/electron-app/electron/services/json-storage.ts`
- **Storage Path**: `{userData}/harmonysync-data/`
- **Files**:
  - `scheduled-events.json` - Scheduler events
  - `macros.json` - User-defined macros
  - `settings.json` - Application settings
  - `gdrive-sync.json` - Google Drive sync configuration

#### Storage Architecture
- In-memory caching for performance
- Automatic file creation if missing
- Pretty-printed JSON (2-space indentation)
- Async operations throughout
- Type-safe interfaces for all data

#### Making Storage Changes

1. **Adding New Data Type**
   ```typescript
   // 1. Define interface
   interface MyData {
     id: string;
     name: string;
     createdAt: string;
   }

   // 2. Add private property
   private myDataList: MyData[] = [];

   // 3. Add load method
   private async loadMyData(): Promise<void> {
     const filePath = path.join(this.storagePath, 'my-data.json');
     try {
       if (await fs.pathExists(filePath)) {
         this.myDataList = await fs.readJson(filePath);
       } else {
         this.myDataList = [];
         await this.saveMyData();
       }
     } catch (error) {
       this.log('error', 'Error loading my data:', error);
       this.myDataList = [];
     }
   }

   // 4. Add save method
   private async saveMyData(): Promise<void> {
     const filePath = path.join(this.storagePath, 'my-data.json');
     await fs.writeJson(filePath, this.myDataList, { spaces: 2 });
   }

   // 5. Add CRUD methods
   public async getAllMyData(): Promise<MyData[]> {
     this.ensureInitialized();
     return [...this.myDataList];
   }

   public async createMyData(data: Partial<MyData>): Promise<MyData> {
     this.ensureInitialized();
     const newData: MyData = {
       // Using Date.now() for simplicity in this example
       // For production, use UUID library (e.g., import { v4 as uuidv4 } from 'uuid')
       id: Date.now().toString(),
       name: data.name || 'Untitled',
       createdAt: new Date().toISOString()
     };
     this.myDataList.push(newData);
     await this.saveMyData();
     return newData;
   }

   // 6. Call loadMyData() in onInitialize()
   ```

2. **Modifying Existing Data Structure**
   - Add migration logic if changing structure
   - Handle backward compatibility
   - Update TypeScript interfaces
   - Update tests

3. **Common Storage Tasks**
   - **Add Field**: Update interface → Update load/save → Add migration if needed → Update tests
   - **Fix Data Corruption**: Add validation → Handle missing fields → Add error recovery
   - **Optimize Performance**: Check if data should be cached → Consider indexing strategy
   - **Debug Storage Issue**: Check file path → Verify JSON format → Check permissions → Review logs

4. **Per-Presentation Storage**
   - Some data is stored per-presentation (songs/slides)
   - Location: `{presentationFolder}/harmonysync.json`
   - Methods: `getSongMetadata()`, `saveSongMetadata()`
   - Also supports `youtube.txt` for YouTube links

5. **Testing Storage**
   ```typescript
   // Use mock file system in tests
   const fs = context.fileSystem as MockFileSystem;
   fs.addFile('/mock/userData/my-data.json', JSON.stringify([...]));
   
   // Test CRUD operations
   const data = await service.getAllMyData();
   expect(data).toHaveLength(1);
   ```

6. **Storage Best Practices**
   - Always use `this.ensureInitialized()` before operations
   - Use proper error handling with try-catch
   - Log important operations
   - Keep JSON files human-readable (pretty-print)
   - Backup before migrations
   - Use TypeScript interfaces for type safety
   - Test all CRUD operations

#### Storage Resources
- JSON Storage Service: `apps/electron-app/electron/services/json-storage.ts`
- Example Usage: Search for `getJSONStorageService()` in codebase
- Testing Examples: `apps/testing/utils/electron-tests/__tests__/` (various service tests)

### Additional Resources

- **Start Here**: `docs/START_HERE.md` - Overview of the entire project
- **Architecture**: `docs/ARCHITECTURE_ANALYSIS.md` - Deep dive into system architecture
- **Testing**: `docs/TESTING_GUIDE.md` - Comprehensive testing documentation
- **MVVM Pattern**: `docs/MVVM_QUICK_REFERENCE.md` - MVVM implementation guide
- **TypeScript**: `docs/TYPESCRIPT_MIGRATION_GUIDE.md` - TypeScript patterns and conventions
