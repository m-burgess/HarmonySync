/**
 * Data Access Layer - Core Interfaces
 * 
 * Provides abstractions for persistent storage operations
 */

/**
 * Generic repository interface for CRUD operations
 */
export interface IRepository<T> {
  /**
   * Get an entity by ID
   */
  getById(id: string): Promise<T | null>;

  /**
   * Get all entities
   */
  getAll(): Promise<T[]>;

  /**
   * Query entities with a predicate
   */
  query(predicate: (item: T) => boolean): Promise<T[]>;

  /**
   * Create a new entity
   */
  create(data: Omit<T, 'id'> & { id?: string }): Promise<string>;

  /**
   * Update an existing entity
   */
  update(id: string, data: Partial<T>): Promise<void>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities
   */
  count(predicate?: (item: T) => boolean): Promise<number>;
}

/**
 * Storage provider interface
 * Abstracts the underlying storage mechanism (JSON, SQLite, etc.)
 */
export interface IStorageProvider {
  /**
   * Read data from storage
   */
  read<T = any>(collection: string): Promise<T[]>;

  /**
   * Write data to storage
   */
  write<T = any>(collection: string, data: T[]): Promise<void>;

  /**
   * Check if collection exists
   */
  exists(collection: string): Promise<boolean>;

  /**
   * Delete a collection
   */
  deleteCollection(collection: string): Promise<void>;

  /**
   * List all collections
   */
  listCollections(): Promise<string[]>;

  /**
   * Initialize storage
   */
  initialize(): Promise<void>;

  /**
   * Close storage connections
   */
  close(): Promise<void>;
}

/**
 * Query builder for advanced filtering
 */
export interface IQueryBuilder<T> {
  /**
   * Filter by field value
   */
  where(field: keyof T, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains', value: any): this;

  /**
   * Logical AND
   */
  and(): this;

  /**
   * Logical OR
   */
  or(): this;

  /**
   * Sort by field
   */
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): this;

  /**
   * Limit results
   */
  limit(count: number): this;

  /**
   * Skip results
   */
  skip(count: number): this;

  /**
   * Execute query
   */
  execute(): Promise<T[]>;

  /**
   * Execute and return first result
   */
  first(): Promise<T | null>;

  /**
   * Execute and return count
   */
  count(): Promise<number>;
}

/**
 * Cache provider interface
 */
export interface ICacheProvider {
  /**
   * Get cached value
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set cached value with optional TTL
   */
  set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete cached value
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Get cache size
   */
  size(): Promise<number>;
}

/**
 * Transaction interface for atomic operations
 */
export interface ITransaction {
  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;

  /**
   * Get repository within transaction
   */
  getRepository<T>(collection: string): IRepository<T>;
}

/**
 * Migration interface
 */
export interface IMigration {
  /**
   * Migration version
   */
  version: number;

  /**
   * Migration description
   */
  description: string;

  /**
   * Apply migration
   */
  up(storage: IStorageProvider): Promise<void>;

  /**
   * Revert migration
   */
  down(storage: IStorageProvider): Promise<void>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /**
   * Storage type
   */
  type: 'json' | 'sqlite' | 'memory';

  /**
   * Base path for storage files
   */
  basePath: string;

  /**
   * Enable caching
   */
  enableCache?: boolean;

  /**
   * Cache TTL in seconds
   */
  cacheTTL?: number;

  /**
   * Enable auto-save
   */
  autoSave?: boolean;

  /**
   * Auto-save interval in milliseconds
   */
  autoSaveInterval?: number;

  /**
   * Enable backups
   */
  enableBackups?: boolean;

  /**
   * Maximum backup files to keep
   */
  maxBackups?: number;

  /**
   * Enable encryption
   */
  enableEncryption?: boolean;

  /**
   * Encryption key
   */
  encryptionKey?: string;
}
