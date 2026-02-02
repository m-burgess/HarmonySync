# Testing Quick Reference

## Quick Start

### 1. Import Testing Utilities

```typescript
// Import everything you need from one place
import {
  // Test context and config
  createTestServiceContext,
  createTestServiceConfig,
  
  // Mock implementations
  MockFileSystem,
  MockElectronApp,
  MockLogger,
  MockEventBus,
  MockHttpClient,
  MockDatabase,
  
  // Test helpers
  setupTestFileSystem,
  createTestDirectoryStructure,
  captureEvents,
  waitForEvent,
  
  // Type interfaces
  IServiceContext,
  IFileSystem,
  ILogger
} from '../../test-utils';
```

### 2. Basic Test Structure

```typescript
describe('MyService', () => {
  let context: IServiceContext;
  let service: MyService;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    context = createTestServiceContext();
    service = new MyService(context);
    
    // Set up test data if needed
    const fs = context.fileSystem as MockFileSystem;
    fs.addFile('/mock/test.txt', 'test content');
  });
  
  afterEach(() => {
    // Clean up mocks
    (context.fileSystem as MockFileSystem).clear();
    (context.logger as MockLogger).clear();
    (context.eventBus as MockEventBus).clear();
  });
  
  it('should do something', async () => {
    // Test implementation
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

## Common Patterns

### Testing File Operations

```typescript
it('should read file', async () => {
  const fs = context.fileSystem as MockFileSystem;
  fs.addFile('/test/file.txt', 'content');
  
  const result = await service.readFile('/test/file.txt');
  expect(result).toBe('content');
});

it('should write file', async () => {
  const fs = context.fileSystem as MockFileSystem;
  
  await service.writeFile('/test/output.txt', 'data');
  
  const content = await fs.readFile('/test/output.txt', 'utf-8');
  expect(content).toBe('data');
});
```

### Testing Events

```typescript
it('should emit event', async () => {
  const eventBus = context.eventBus as MockEventBus;
  const { events, cleanup } = captureEvents(eventBus, 'task:complete');
  
  await service.performTask();
  
  expect(events).toHaveLength(1);
  expect(events[0]).toEqual({ status: 'success' });
  cleanup();
});

it('should wait for event', async () => {
  const eventBus = context.eventBus as MockEventBus;
  const eventPromise = waitForEvent(eventBus, 'data:loaded');
  
  service.loadData();
  
  const eventData = await eventPromise;
  expect(eventData).toBeDefined();
});
```

### Testing HTTP Requests

```typescript
it('should fetch data', async () => {
  const http = context.httpClient as MockHttpClient;
  http.mockResponse('https://api.example.com/data', {
    data: { id: 1, name: 'Test' },
    status: 200,
    statusText: 'OK',
    headers: {}
  });
  
  const result = await service.fetchData();
  expect(result.name).toBe('Test');
});
```

### Testing Logging

```typescript
it('should log messages', async () => {
  const logger = context.logger as MockLogger;
  
  await service.doWork();
  
  expect(logger.hasLog('info', 'Work completed')).toBe(true);
  expect(logger.logs).toHaveLength(2);
});
```

### Testing Electron APIs

```typescript
it('should use app paths', () => {
  const app = context.electronApp as MockElectronApp;
  app.setPath('userData', '/test/userdata');
  
  const path = service.getConfigPath();
  expect(path).toBe('/test/userdata/config.json');
});
```

### Testing Database Operations

```typescript
it('should save to database', async () => {
  const db = context.database as MockDatabase;
  
  const id = await service.saveItem({ name: 'Test' });
  
  const item = await db.get('items', id);
  expect(item.name).toBe('Test');
});

it('should query database', async () => {
  const db = context.database as MockDatabase;
  await db.create('items', { name: 'Item 1', active: true });
  await db.create('items', { name: 'Item 2', active: false });
  
  const activeItems = await service.getActiveItems();
  expect(activeItems).toHaveLength(1);
});
```

## Mock Data Factories

```typescript
import {
  createTestAudioMetadata,
  createTestVideoMetadata,
  createTestSlideContent,
  createTestScheduledEvent,
  createTestMacro,
  createTestDisplayConfig
} from '../../test-utils';

it('should process audio', async () => {
  const metadata = createTestAudioMetadata({ duration: 240 });
  // Use metadata in test
});
```

## Testing Error Cases

```typescript
it('should handle file not found', async () => {
  await expect(
    service.readFile('/nonexistent.txt')
  ).rejects.toThrow('no such file');
});

it('should handle HTTP errors', async () => {
  // Don't mock a response, let it throw
  await expect(
    service.fetchData()
  ).rejects.toThrow();
});
```

## Testing Async Operations

```typescript
import { waitFor, sleep } from '../../test-utils';

it('should complete within timeout', async () => {
  await waitFor(() => service.isReady(), 5000, 100);
  expect(service.isReady()).toBe(true);
});

it('should delay execution', async () => {
  const start = Date.now();
  await sleep(100);
  const duration = Date.now() - start;
  expect(duration).toBeGreaterThanOrEqual(100);
});
```

## Verify Test Coverage

```bash
# Run tests with coverage report
npm run test:coverage

# Coverage report will show:
# - Lines covered
# - Branches covered
# - Functions covered
# - Uncovered lines
```

## Common Gotchas

### ❌ Don't forget to clean up mocks

```typescript
afterEach(() => {
  (context.fileSystem as MockFileSystem).clear();
  (context.logger as MockLogger).clear();
  (context.eventBus as MockEventBus).clear();
  (context.httpClient as MockHttpClient).clear();
  (context.database as MockDatabase).clear();
});
```

### ❌ Don't use real paths in tests

```typescript
// Bad - uses real file system
const path = '/Users/me/Desktop/file.txt';

// Good - uses mock paths
const path = '/mock/test/file.txt';
```

### ❌ Don't forget to initialize services

```typescript
// Bad
const service = new MyService(context);
await service.doWork(); // Might fail if not initialized

// Good
const service = new MyService(context);
await service.initialize();
await service.doWork();
```

### ✅ Do use async/await consistently

```typescript
// Good
it('should complete async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### ✅ Do test both success and failure cases

```typescript
describe('processFile', () => {
  it('should process valid file', async () => {
    // Test success case
  });
  
  it('should handle missing file', async () => {
    // Test error case
  });
  
  it('should handle invalid format', async () => {
    // Test error case
  });
});
```

## Full Example

See `electron/test-utils/__tests__/example-service.test.ts` for a complete working example.

## More Information

- [TESTING_ABSTRACTIONS_GUIDE.md](../TESTING_ABSTRACTIONS_GUIDE.md) - Comprehensive guide
- [testing.ts](../electron/types/testing.ts) - Interface definitions and mocks
- [test-helpers.ts](../electron/test-utils/test-helpers.ts) - Helper utilities
