/**
 * Example Test File - Audio Service
 * Demonstrates how to use the shared mocks for testing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MockAudioTrack,
  MockAudioMixer,
  createMockSocketServer,
  createMockSocketClient
} from '@harmonysync-tests/mocks';

describe('Example: Audio Service with Shared Mocks', () => {
  let mixer: MockAudioMixer;
  let mockIo: any;

  beforeEach(() => {
    mixer = new MockAudioMixer();
    mockIo = createMockSocketServer();
  });

  afterEach(() => {
    mixer.clearAllTracks();
  });

  describe('Track Management', () => {
    test('should load a track', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3', 'Test Track');
      
      expect(trackId).toBeDefined();
      expect(mixer.tracks.has(trackId)).toBe(true);
      
      const track = mixer.tracks.get(trackId);
      expect(track?.name).toBe('Test Track');
      expect(track?.filePath).toBe('/path/to/audio.mp3');
    });

    test('should play a track', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3');
      await mixer.playTrack(trackId);
      
      const track = mixer.tracks.get(trackId);
      expect(track?.isPlaying).toBe(true);
    });

    test('should set track volume', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3');
      mixer.setTrackVolume(trackId, 0.5);
      
      const track = mixer.tracks.get(trackId);
      expect(track?.volume).toBe(0.5);
    });

    test('should mute a track', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3');
      mixer.setTrackMute(trackId, true);
      
      const track = mixer.tracks.get(trackId);
      expect(track?.isMuted).toBe(true);
    });

    test('should delete a track', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3');
      const deleted = mixer.deleteTrack(trackId);
      
      expect(deleted).toBe(true);
      expect(mixer.tracks.has(trackId)).toBe(false);
    });
  });

  describe('Song Management', () => {
    test('should create a song with tracks', async () => {
      const track1Id = await mixer.loadTrack('/path/to/track1.mp3', 'Track 1');
      const track2Id = await mixer.loadTrack('/path/to/track2.mp3', 'Track 2');
      
      const songId = mixer.createSong('Test Song', [track1Id, track2Id]);
      
      expect(songId).toBeDefined();
      expect(mixer.songs.has(songId)).toBe(true);
      
      const song = mixer.songs.get(songId);
      expect(song?.name).toBe('Test Song');
      expect(song?.trackIds).toHaveLength(2);
    });

    test('should play a song', async () => {
      const track1Id = await mixer.loadTrack('/path/to/track1.mp3');
      const track2Id = await mixer.loadTrack('/path/to/track2.mp3');
      const songId = mixer.createSong('Test Song', [track1Id, track2Id]);
      
      await mixer.playSong(songId);
      
      const song = mixer.songs.get(songId);
      expect(song?.isPlaying).toBe(true);
      expect(mixer.currentSongId).toBe(songId);
      
      // Both tracks should be playing
      const track1 = mixer.tracks.get(track1Id);
      const track2 = mixer.tracks.get(track2Id);
      expect(track1?.isPlaying).toBe(true);
      expect(track2?.isPlaying).toBe(true);
    });

    test('should stop a song', async () => {
      const track1Id = await mixer.loadTrack('/path/to/track1.mp3');
      const songId = mixer.createSong('Test Song', [track1Id]);
      
      await mixer.playSong(songId);
      await mixer.stopSong(songId);
      
      const song = mixer.songs.get(songId);
      expect(song?.isPlaying).toBe(false);
      expect(mixer.currentSongId).toBeNull();
    });
  });

  describe('Mixer State', () => {
    test('should get mixer state', async () => {
      const trackId = await mixer.loadTrack('/path/to/audio.mp3', 'Test');
      const state = mixer.getState();
      
      expect(state.masterVolume).toBe(1.0);
      expect(state.tracks).toHaveLength(1);
      expect(state.tracks[0].id).toBe(trackId);
    });

    test('should set master volume', () => {
      mixer.setMasterVolume(0.75);
      expect(mixer.masterVolume).toBe(0.75);
    });
  });

  describe('Socket.IO Integration', () => {
    test('should emit events on track load', async () => {
      const emittedEvents: any[] = [];
      mixer.on('track_loaded', (data) => emittedEvents.push(data));
      
      const trackId = await mixer.loadTrack('/path/to/audio.mp3', 'Test');
      
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]).toMatchObject({
        trackId,
        name: 'Test'
      });
    });

    test('should handle socket connection', () => {
      const client = createMockSocketClient();
      
      // Simulate server connection handler
      mockIo._simulateConnection(client);
      
      const clients = mockIo._getClients();
      expect(clients).toHaveLength(1);
      expect(clients[0].id).toBe(client.id);
    });

    test('should handle socket events from client', () => {
      const client = createMockSocketClient();
      const receivedData: any[] = [];
      
      client.on('track_loaded', (data: any) => {
        receivedData.push(data);
      });
      
      // Simulate server emitting event
      client._trigger('track_loaded', { trackId: 'test-123', name: 'Test' });
      
      expect(receivedData).toHaveLength(1);
      expect(receivedData[0].trackId).toBe('test-123');
    });
  });

  describe('Individual Track Tests', () => {
    test('should create and control a track directly', async () => {
      const track = new MockAudioTrack('track-1', 'Test Track', '/path/to/audio.mp3');
      
      expect(track.id).toBe('track-1');
      expect(track.isPlaying).toBe(false);
      
      await track.play();
      expect(track.isPlaying).toBe(true);
      
      await track.stop();
      expect(track.isPlaying).toBe(false);
      expect(track.currentPosition).toBe(0);
    });

    test('should emit events on track operations', async () => {
      const track = new MockAudioTrack('track-1', 'Test', '/path/to/audio.mp3');
      const events: string[] = [];
      
      track.on('play', () => events.push('play'));
      track.on('stop', () => events.push('stop'));
      track.on('volumeChange', () => events.push('volumeChange'));
      
      await track.play();
      track.setVolume(0.5);
      await track.stop();
      
      expect(events).toEqual(['play', 'volumeChange', 'stop']);
    });
  });
});
