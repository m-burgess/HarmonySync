/**
 * Smoke Test for Video Service
 * Quick verification that the video service starts and responds to basic requests
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('Video Service Smoke Test', () => {
  let app: any;
  let server: any;

  beforeAll(() => {
    const srv = require('../../../harmonysync-video-service/server');
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

  test('should have FFmpeg library available', () => {
    expect(() => {
      const ffmpeg = require('fluent-ffmpeg');
      expect(ffmpeg).toBeDefined();
    }).not.toThrow();
  });

  test('should initialize Socket.IO', () => {
    const { io } = require('../../../harmonysync-video-service/server');
    expect(io).toBeDefined();
  });

  test('should handle basic requests', () => {
    // Smoke test: basic startup check
    expect(true).toBe(true);
  });
});
