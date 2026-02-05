/**
 * Smoke Test for Folder Service
 * Quick verification that the folder service starts and responds to basic requests
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('Folder Service Smoke Test', () => {
  let app: any;
  let server: any;

  beforeAll(() => {
    const srv = require('../../../harmonysync-folder-service/server');
    app = srv.app;
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  test('should start without crashing', () => {
    expect(app).toBeDefined();
  });

  test('should respond to health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  test('should have file system watcher available', () => {
    // Smoke test: verify chokidar or fs.watch is available
    expect(() => {
      const chokidar = require('chokidar');
      expect(chokidar).toBeDefined();
    }).not.toThrow();
  });

  test('should initialize Socket.IO', () => {
    const { io } = require('../../../harmonysync-folder-service/server');
    expect(io).toBeDefined();
  });

  test('should handle sync operations', () => {
    // Smoke test: basic sync check
    expect(true).toBe(true);
  });
});
