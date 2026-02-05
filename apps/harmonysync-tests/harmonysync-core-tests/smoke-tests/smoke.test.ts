/**
 * Smoke Test for Core Logic
 * Quick verification that shared core packages load correctly
 */

import { describe, test, expect } from '@jest/globals';

describe('Core Logic Smoke Test', () => {
  test('should load @harmonysync/core package', () => {
    expect(() => {
      const core = require('@harmonysync/core');
      expect(core).toBeDefined();
    }).not.toThrow();
  });

  test('should load @harmonysync/data-access package', () => {
    expect(() => {
      const dataAccess = require('@harmonysync/data-access');
      expect(dataAccess).toBeDefined();
      expect(dataAccess.Repository).toBeDefined();
      expect(dataAccess.JsonStorageProvider).toBeDefined();
    }).not.toThrow();
  });

  test('should create Repository instance', () => {
    const { Repository, JsonStorageProvider } = require('@harmonysync/data-access');
    const storage = new JsonStorageProvider('/tmp/smoke-test');
    const repo = new Repository(storage);
    expect(repo).toBeDefined();
  });

  test('should create Cache instance', () => {
    const { MemoryCacheProvider } = require('@harmonysync/data-access');
    const cache = new MemoryCacheProvider({ maxSize: 10 });
    expect(cache).toBeDefined();
  });

  test('should export core types', () => {
    const core = require('@harmonysync/core');
    // Smoke test: types should be available
    expect(core).toBeDefined();
  });
});
