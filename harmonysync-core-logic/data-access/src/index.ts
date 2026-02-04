/**
 * Data Access Layer
 * 
 * Central export point for all data access functionality
 */

// Interfaces
export * from './interfaces';

// Implementations
export { JsonStorageProvider } from './json-storage';
export { Repository } from './repository';
export { MemoryCacheProvider } from './cache';

// Re-export commonly used types from core
export type {
  DisplayConfig,
  ScheduledEvent,
  Macro,
  Script,
  Slide,
  SlideGroup
} from '@harmonysync/core';
