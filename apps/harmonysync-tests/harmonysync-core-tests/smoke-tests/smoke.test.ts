import { describe, test, expect } from '@jest/globals';
import * as core from '@harmonysync/core';
import * as dataAccess from '@harmonysync/data-access';

describe('Core Logic Smoke Test', () => {
  test('should load @harmonysync/core package', () => {
    expect(core).toBeDefined();
    expect(core.SongMapper).toBeDefined();
  });

  test('should load @harmonysync/data-access package', () => {
    expect(dataAccess).toBeDefined();
    expect(dataAccess.Repository).toBeDefined();
    expect(dataAccess.MemoryCacheProvider).toBeDefined();
    expect(dataAccess.JsonStorageProvider).toBeDefined();
  });

  test('should create Repository instance', () => {
    const storageMock = {
      read: async () => [],
      write: async () => {},
    } as any;
    const repo = new dataAccess.Repository('test', storageMock);
    expect(repo).toBeInstanceOf(dataAccess.Repository);
  });

  test('should create Cache instance', () => {
    const cache = new dataAccess.MemoryCacheProvider(10);
    expect(cache).toBeInstanceOf(dataAccess.MemoryCacheProvider);
  });

  test('should export core types', () => {
    // Basic check that types are available (via value check)
    expect(core.SongMapper).toBeDefined();
  });
});
