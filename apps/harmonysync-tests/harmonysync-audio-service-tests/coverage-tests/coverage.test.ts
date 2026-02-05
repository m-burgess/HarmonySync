/**
 * Coverage Test for Audio Service
 * Ensures critical audio service paths are covered
 */

import { describe, test, expect } from '@jest/globals';

describe('Audio Service Coverage', () => {
  test('should cover AudioMixer initialization', () => {
    const { AudioMixer } = require('../../../harmonysync-audio-service/audioMixer');
    const mixer = new AudioMixer();
    expect(mixer).toBeDefined();
    expect(mixer.tracks).toBeDefined();
    expect(mixer.songs).toBeDefined();
  });

  test('should cover AudioTrack creation', () => {
    const { AudioTrack } = require('../../../harmonysync-audio-service/audioTrack');
    const track = new AudioTrack('test-id', 'Test Track', '/tmp/test.wav', 180, 2, 44100);
    expect(track).toBeDefined();
    expect(track.id).toBe('test-id');
    expect(track.name).toBe('Test Track');
  });

  test('should cover REST API endpoints', () => {
    const { app } = require('../../../harmonysync-audio-service/server');
    expect(app).toBeDefined();
    expect(app._router).toBeDefined();
  });

  test('should cover Socket.IO server setup', () => {
    const { serverInstance } = require('../../../harmonysync-audio-service/server');
    expect(serverInstance).toBeDefined();
    expect(serverInstance.io).toBeDefined();
  });

  test('should cover volume and pan controls', () => {
    const { AudioMixer } = require('../../../harmonysync-audio-service/audioMixer');
    const mixer = new AudioMixer();
    
    mixer.setMasterVolume(0.5);
    expect(mixer.masterVolume).toBeCloseTo(0.5);
    
    mixer.setCrossfadeDuration(2000);
    expect(mixer.crossfadeDuration).toBe(2000);
  });
});
