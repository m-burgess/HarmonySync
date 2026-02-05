/**
 * Smoke Test for Audio Service
 * Quick verification that the audio service starts and responds to basic requests
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('Audio Service Smoke Test', () => {
  let app: any;
  let server: any;

  beforeAll(() => {
    const srv = require('../../../harmonysync-audio-service/server');
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
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  test('should have mixer available', () => {
    const { mixer } = require('../../../harmonysync-audio-service/server');
    expect(mixer).toBeDefined();
    expect(mixer.tracks).toBeDefined();
  });

  test('should create AudioMixer instance', () => {
    const { AudioMixer } = require('../../../harmonysync-audio-service/audioMixer');
    const mixer = new AudioMixer();
    expect(mixer).toBeDefined();
  });

  test('should create AudioTrack instance', () => {
    const { AudioTrack } = require('../../../harmonysync-audio-service/audioTrack');
    const track = new AudioTrack('smoke-1', 'Smoke Test', '/tmp/test.wav', 60, 2, 44100);
    expect(track.id).toBe('smoke-1');
  });
});
