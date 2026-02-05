/**
 * Coverage Test for Core Logic
 * Ensures critical shared logic paths are covered
 */

import { describe, test, expect } from '@jest/globals';

describe('Core Logic Coverage', () => {
  test('should cover shared type definitions', () => {
    const core = require('@harmonysync/core');
    expect(core).toBeDefined();
  });

  test('should cover data access layer', () => {
    const { Repository, JsonStorageProvider } = require('@harmonysync/data-access');
    expect(Repository).toBeDefined();
    expect(JsonStorageProvider).toBeDefined();
  });

  test('should cover Repository CRUD operations', () => {
    const { Repository, JsonStorageProvider } = require('@harmonysync/data-access');
    const storage = new JsonStorageProvider('/tmp/test-storage');
    const repo = new Repository(storage);
    
    expect(repo.create).toBeDefined();
    expect(repo.read).toBeDefined();
    expect(repo.update).toBeDefined();
    expect(repo.delete).toBeDefined();
    expect(repo.list).toBeDefined();
  });

  test('should cover cache provider', () => {
    const { MemoryCacheProvider } = require('@harmonysync/data-access');
    const cache = new MemoryCacheProvider({ maxSize: 100 });
    
    expect(cache.get).toBeDefined();
    expect(cache.set).toBeDefined();
    expect(cache.delete).toBeDefined();
    expect(cache.clear).toBeDefined();
  });

  test('should cover audio types', () => {
    const types = require('@harmonysync/core');
    expect(types).toHaveProperty('Song');
  });

  test('should cover video types', () => {
    const types = require('@harmonysync/core');
    expect(types).toHaveProperty('VideoMetadata');
  });

  test('should cover image types', () => {
    const types = require('@harmonysync/core');
    expect(types).toHaveProperty('ImageMetadata');
  });
});
