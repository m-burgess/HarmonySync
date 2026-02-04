# Data Access Layer (@harmonysync/data-access)

Provides a consistent, type-safe data access layer for persistent storage in HarmonySync.

## Features

- **Repository Pattern** - Generic CRUD operations for any entity
- **Storage Abstraction** - Support for JSON files, SQLite, in-memory
- **Caching** - Built-in LRU cache with TTL support
- **Type-Safe** - Full TypeScript support with generics
- **Transaction Support** - Atomic operations (planned)
- **Migration System** - Database versioning (planned)

## Architecture

```
┌─────────────────┐
│  Application    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Repository     │ ◄─── IRepository<T>
└────────┬────────┘
         │
┌────────▼────────┐
│ Storage Provider│ ◄─── IStorageProvider
└────────┬────────┘
         │
    ┌────▼────┬──────┬────────┐
    │  JSON   │ SQLite│ Memory │
    └─────────┴───────┴────────┘
```

## Quick Start

### Basic Usage

```typescript
import { JsonStorageProvider, Repository } from '@harmonysync/data-access';
import type { DisplayConfig } from '@harmonysync/core';

// Initialize storage
const storage = new JsonStorageProvider('/path/to/data');
await storage.initialize();

// Create repository
const displayRepo = new Repository<DisplayConfig>('displays', storage);

// CRUD operations
const id = await displayRepo.create({
  name: 'Main Display',
  type: 'audience',
  enabled: true,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 }
});

const display = await displayRepo.getById(id);
await displayRepo.update(id, { enabled: false });
await displayRepo.delete(id);
```

### With Caching

```typescript
import { JsonStorageProvider, MemoryCacheProvider } from '@harmonysync/data-access';

const storage = new JsonStorageProvider('/path/to/data');
const cache = new MemoryCacheProvider(500); // Max 500 items

// Cache frequently accessed data
await cache.set('config:display', displayConfig, 3600); // 1 hour TTL
const cached = await cache.get<DisplayConfig>('config:display');
```

### Query Operations

```typescript
// Get all enabled displays
const enabledDisplays = await displayRepo.query(d => d.enabled === true);

// Get displays by type
const audienceDisplays = await displayRepo.query(d => d.type === 'audience');

// Count displays
const total = await displayRepo.count();
const activeCount = await displayRepo.count(d => d.enabled);
```

## Storage Providers

### JSON Storage

Stores data as JSON files on disk. Best for:
- Small to medium datasets
- Human-readable storage
- Easy debugging and manual editing

```typescript
const storage = new JsonStorageProvider('./data');
await storage.initialize();

// Collections stored as: ./data/{collection}.json
```

### Memory Storage (Coming Soon)

In-memory storage for testing and temporary data.

### SQLite Storage (Coming Soon)

Full database with indexes and transactions.

## Repository Pattern

```typescript
interface IRepository<T> {
  getById(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
  create(data: Omit<T, 'id'> & { id?: string }): Promise<string>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(predicate?: (item: T) => boolean): Promise<number>;
}
```

## Cache Provider

```typescript
interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
```

## Usage Examples

### Display Configuration Service

```typescript
class DisplayConfigService {
  private repo: Repository<DisplayConfig>;
  
  constructor(storage: IStorageProvider) {
    this.repo = new Repository('displays', storage);
  }
  
  async getAllEnabled(): Promise<DisplayConfig[]> {
    return this.repo.query(d => d.enabled === true);
  }
  
  async getByType(type: string): Promise<DisplayConfig[]> {
    return this.repo.query(d => d.type === type);
  }
  
  async updateOrder(ids: string[]): Promise<void> {
    const displays = await this.repo.getAll();
    for (let i = 0; i < ids.length; i++) {
      const display = displays.find(d => d.id === ids[i]);
      if (display) {
        await this.repo.update(ids[i], { order: i });
      }
    }
  }
}
```

### Scheduler Service

```typescript
class SchedulerService {
  private repo: Repository<ScheduledEvent>;
  
  constructor(storage: IStorageProvider) {
    this.repo = new Repository('scheduled_events', storage);
  }
  
  async getUpcoming(minutes: number): Promise<ScheduledEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60000);
    
    return this.repo.query(event => {
      const startTime = new Date(event.startTime);
      return startTime >= now && startTime <= future;
    });
  }
  
  async getByDateRange(start: Date, end: Date): Promise<ScheduledEvent[]> {
    return this.repo.query(event => {
      const eventTime = new Date(event.startTime);
      return eventTime >= start && eventTime <= end;
    });
  }
}
```

## Best Practices

1. **One Repository Per Entity** - Create separate repositories for each entity type
2. **Use Type Parameters** - Leverage TypeScript generics for type safety
3. **Initialize Once** - Create storage provider once and share across repositories
4. **Cache Hot Paths** - Use cache for frequently accessed data
5. **Handle Errors** - All operations can throw, wrap in try-catch
6. **Close Connections** - Call `storage.close()` on shutdown

## Testing

The data access layer is designed to be easily testable:

```typescript
import { MemoryStorageProvider } from '@harmonysync/data-access';

// Use in-memory storage for tests
const storage = new MemoryStorageProvider();
const repo = new Repository('test', storage);

// No file I/O, fast tests
await repo.create({ name: 'test' });
const items = await repo.getAll();
```

## Future Enhancements

- [ ] Transaction support for atomic operations
- [ ] Query builder for complex queries
- [ ] Migration system for schema changes
- [ ] Backup/restore utilities
- [ ] Encryption support
- [ ] SQLite provider
- [ ] Event sourcing
- [ ] Change tracking/audit log
