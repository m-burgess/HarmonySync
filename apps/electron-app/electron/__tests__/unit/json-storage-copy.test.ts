import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { createTempDir, trackService, cleanupAll } from '../test-utils';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn()
  }
}));

describe('JSONStorageService Copy Full', () => {
  let JSONStorageService: any;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await createTempDir('js-');
    (app.getPath as jest.Mock).mockReturnValue(tempDir);

    const mod = require('../../services/json-storage-copy');
    JSONStorageService = mod.JSONStorageService;
  });

  afterAll(async () => {
    await cleanupAll();
  });

  test('dummy', () => {
    expect(JSONStorageService).toBeDefined();
  });
});
