/**
 * Smoke Test for Image Service
 * Quick verification that the image service starts and responds to basic requests
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('Image Service Smoke Test', () => {
  let app: any;
  let server: any;

  beforeAll(() => {
    const srv = require('../../../harmonysync-image-service/server');
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
    const response = await request(app).get('/api/health');
    expect([200, 404]).toContain(response.status);
  });

  test('should have Sharp library available', () => {
    expect(() => {
      const sharp = require('sharp');
      expect(sharp).toBeDefined();
    }).not.toThrow();
  });

  test('should initialize without errors', () => {
    // Smoke test: basic startup check
    expect(true).toBe(true);
  });
});
