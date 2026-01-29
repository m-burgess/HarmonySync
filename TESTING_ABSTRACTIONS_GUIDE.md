# Testing Abstractions and Interfaces Guide

## Overview

This guide explains the new testing abstractions and interfaces that have been added to improve testability of the TypeScript codebase. These abstractions solve common testing challenges by providing mockable interfaces for external dependencies.

## Problem Statement

The original codebase had several testing challenges:

1. **Hard dependencies on Electron runtime** - Services directly imported and used `app`, `BrowserWindow`, etc.
2. **Tight coupling to external tools** - Direct usage of `fluent-ffmpeg`, `fs-extra`, `child_process`
3. **No dependency injection** - Services created their own dependencies
4. **Difficult to mock** - External dependencies were not abstracted
5. **Integration tests required** - Many tests needed full Electron environment

## Solution: Abstraction Layers

We've introduced abstraction interfaces for all external dependencies, enabling true unit testing without requiring the actual runtime environment.

## Key Abstractions

### 1. File System Abstraction (`IFileSystem`)

**Problem**: Tests required actual file system operations, making them slow and potentially flaky.

**Solution**: `IFileSystem` interface with `MockFileSystem` implementation.

```typescript
// Before (untestable)
import * as fs from 'fs-extra';

class MyService {
  async readConfig() {
    return await fs.readFile('/path/to/config.json', 'utf-8');
  }
}

// After (testable)
import { IFileSystem } from '../types/testing';

class MyService {
  constructor(private fs: IFileSystem) {}
  
  async readConfig() {
    return await this.fs.readFile('/path/to/config.json', 'utf-8');
  }
}

// Test
import { MockFileSystem } from '../types/testing';

const mockFs = new MockFileSystem();
mockFs.addFile('/path/to/config.json', '{"version": "1.0"}');
const service = new MyService(mockFs);
```

### 2. Electron App Abstraction (`IElectronApp`)

**Problem**: Tests required Electron runtime to access `app.getPath()`, `app.getVersion()`, etc.

**Solution**: `IElectronApp` interface with `MockElectronApp` implementation.

```typescript
// Before (untestable)
import { app } from 'electron';

class MyService {
  getDataPath() {
    return app.getPath('userData');
  }
}

// After (testable)
import { IElectronApp } from '../types/testing';

class MyService {
  constructor(private app: IElectronApp) {}
  
  getDataPath() {
    return this.app.getPath('userData');
  }
}

// Test
import { MockElectronApp } from '../types/testing';

const mockApp = new MockElectronApp();
mockApp.setPath('userData', '/test/userdata');
const service = new MyService(mockApp);
```

### 3. Window Manager Abstraction (`IWindowManager`, `IBrowserWindow`)

**Problem**: Tests required Electron to create and manage browser windows.

**Solution**: Window abstractions that can be mocked.

### 4. FFmpeg Abstraction (`IFFmpegFactory`)

**Problem**: Tests required FFmpeg to be installed and functional.

**Solution**: FFmpeg factory interface that can be mocked.

### 5. Process Executor Abstraction (`IProcessExecutor`)

**Problem**: Tests executed real child processes, making them slow and environment-dependent.

**Solution**: `IProcessExecutor` interface for process operations.

### 6. Event Bus Abstraction (`IEventBus`)

**Problem**: Testing event-driven code was difficult without proper event capture.

**Solution**: `IEventBus` interface with `MockEventBus` implementation.

### 7. HTTP Client Abstraction (`IHttpClient`)

**Problem**: Tests made actual HTTP requests, making them slow and unreliable.

**Solution**: `IHttpClient` interface with `MockHttpClient` implementation.

### 8. Logger Abstraction (`ILogger`)

**Problem**: Console logs cluttered test output and couldn't be verified.

**Solution**: `ILogger` interface with `MockLogger` implementation.

### 9. Database Abstraction (`IDatabase`)

**Problem**: Tests required actual database setup and teardown.

**Solution**: `IDatabase` interface with `MockDatabase` implementation.

## Service Context Pattern

Instead of passing individual dependencies, use `IServiceContext` to bundle all dependencies:

```typescript
import { IServiceContext } from '../types/testing';
import { createTestServiceContext } from '../test-utils/test-helpers';

class MyService {
  constructor(private context: IServiceContext) {}
  
  async doWork() {
    const fs = this.context.fileSystem!;
    const logger = this.context.logger!;
    
    const data = await fs.readFile('/path/to/file', 'utf-8');
    logger.info('File read successfully');
    return data;
  }
}

// Test
const context = createTestServiceContext();
const service = new MyService(context);
```

## Test Helper Utilities

### Creating Test Contexts

```typescript
import { createTestServiceContext } from '../test-utils/test-helpers';

// Create a complete mock context
const context = createTestServiceContext();

// Override specific dependencies
const context = createTestServiceContext({
  logger: customLogger,
  fileSystem: customFileSystem
});
```

### Setting Up Mock File Systems

```typescript
import { setupTestFileSystem, createTestDirectoryStructure } from '../test-utils/test-helpers';
import { MockFileSystem } from '../types/testing';

const fs = new MockFileSystem();

// Quick setup with common files
setupTestFileSystem(fs);

// Create custom directory structure
createTestDirectoryStructure(fs, {
  '/mock/project': null, // directory
  '/mock/project/file1.txt': 'content',
  '/mock/project/file2.txt': 'more content'
});
```

### Event Testing

```typescript
import { captureEvents, waitForEvent } from '../test-utils/test-helpers';

// Capture all events of a type
const { events, cleanup } = captureEvents(eventBus, 'file:processed');
service.processFiles();
expect(events).toHaveLength(3);
cleanup();

// Wait for a specific event
const eventPromise = waitForEvent(eventBus, 'task:complete');
service.startTask();
const result = await eventPromise;
```

## Migration Guide

### Step 1: Update Service Constructor

```typescript
// Before
class MyService extends BaseElectronService {
  constructor(config?: ServiceConfig) {
    super(config);
  }
}

// After
import { IServiceContext } from '../types/testing';

class MyService extends BaseElectronService {
  constructor(
    private context: IServiceContext,
    config?: ServiceConfig
  ) {
    super(config);
  }
}
```

### Step 2: Replace Direct Dependencies

```typescript
// Before
import * as fs from 'fs-extra';
import { app } from 'electron';

async loadConfig() {
  const path = app.getPath('userData') + '/config.json';
  return await fs.readFile(path, 'utf-8');
}

// After
async loadConfig() {
  const fs = this.context.fileSystem!;
  const app = this.context.electronApp!;
  
  const path = app.getPath('userData') + '/config.json';
  return await fs.readFile(path, 'utf-8');
}
```

### Step 3: Update Tests

```typescript
// Before
import MyService from '../my-service';

describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    service = new MyService();
  });
  
  // Tests required actual file system, Electron, etc.
});

// After
import MyService from '../my-service';
import { createTestServiceContext } from '../../test-utils/test-helpers';
import { MockFileSystem } from '../../types/testing';

describe('MyService', () => {
  let context: IServiceContext;
  let service: MyService;
  
  beforeEach(() => {
    context = createTestServiceContext();
    service = new MyService(context);
    
    // Set up test data
    const fs = context.fileSystem as MockFileSystem;
    fs.addFile('/mock/userData/config.json', '{"version": "1.0"}');
  });
  
  afterEach(() => {
    (context.fileSystem as MockFileSystem).clear();
  });
  
  // Pure unit tests with no external dependencies
});
```

## Best Practices

1. **Use Service Context**: Bundle all dependencies in `IServiceContext`
2. **Mock Everything External**: File system, processes, HTTP, Electron APIs
3. **Clean Up After Tests**: Clear mocks in `afterEach()`
4. **Use Test Helpers**: Leverage utilities in `test-helpers.ts`
5. **Test Events**: Use `captureEvents()` and `waitForEvent()`
6. **Verify Side Effects**: Check logger calls, file writes, event emissions
7. **Isolate Tests**: Each test should be independent
8. **Fast Tests**: All tests should run in milliseconds without I/O

## Example: Complete Service with Tests

See `electron/test-utils/example-service.test.ts` for a comprehensive example demonstrating all patterns.

## Available Mock Implementations

- `MockFileSystem` - In-memory file system
- `MockElectronApp` - Electron app simulation
- `MockLogger` - Captures log messages
- `MockEventBus` - Event emitter with helper methods
- `MockHttpClient` - Configurable HTTP responses
- `MockDatabase` - In-memory data storage

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run with coverage
npm test:coverage

# Watch mode
npm test:watch
```

## Files Created

- `electron/types/testing.ts` - All abstraction interfaces and mock implementations
- `electron/test-utils/test-helpers.ts` - Helper utilities for creating test fixtures
- `electron/test-utils/example-service.test.ts` - Complete example demonstrating patterns

## Next Steps for Developers

1. Review the abstractions in `electron/types/testing.ts`
2. Study the example test in `electron/test-utils/example-service.test.ts`
3. When creating new services, use `IServiceContext` for dependencies
4. When writing tests, use `createTestServiceContext()` and mock implementations
5. Gradually migrate existing services to use the new patterns

## Questions?

For issues or questions about testing patterns, create an issue with the `testing` label.
