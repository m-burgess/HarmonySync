/**
 * Shared Audio Service Mocks
 * Mock implementations for audio service components used across tests
 */

import { EventEmitter } from 'events';
import type { AudioTrackState, Song, MixerState, CrossfadeInfo } from '@harmonysync/core';

/**
 * Mock AudioTrack implementation
 */
export class MockAudioTrack extends EventEmitter {
  public id: string;
  public name: string;
  public filePath: string;
  public duration: number;
  public channels: number;
  public sampleRate: number;
  public volume: number = 1.0;
  public pan: number = 0;
  public isMuted: boolean = false;
  public isPlaying: boolean = false;
  public currentPosition: number = 0;
  public audic: any = null;

  constructor(
    id: string,
    name: string,
    filePath: string,
    duration: number = 180,
    channels: number = 2,
    sampleRate: number = 44100
  ) {
    super();
    this.id = id;
    this.name = name;
    this.filePath = filePath;
    this.duration = duration;
    this.channels = channels;
    this.sampleRate = sampleRate;
  }

  async loadMetadata(): Promise<boolean> {
    return true;
  }

  async play(): Promise<void> {
    this.isPlaying = true;
    this.emit('play');
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    this.currentPosition = 0;
    this.emit('stop');
  }

  async pause(): Promise<void> {
    this.isPlaying = false;
    this.emit('pause');
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.emit('volumeChange', this.volume);
  }

  setPan(pan: number): void {
    this.pan = Math.max(-1, Math.min(1, pan));
    this.emit('panChange', this.pan);
  }

  setMute(muted: boolean): void {
    this.isMuted = muted;
    this.emit('muteChange', this.isMuted);
  }

  getState(): AudioTrackState {
    return {
      id: this.id,
      name: this.name,
      filePath: this.filePath,
      duration: this.duration,
      channels: this.channels,
      sampleRate: this.sampleRate,
      volume: this.volume,
      pan: this.pan,
      isMuted: this.isMuted,
      isPlaying: this.isPlaying,
      currentPosition: this.currentPosition
    };
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

/**
 * Mock AudioMixer implementation
 */
export class MockAudioMixer extends EventEmitter {
  public tracks: Map<string, MockAudioTrack> = new Map();
  public songs: Map<string, Song> = new Map();
  public currentSongId: string | null = null;
  public masterVolume: number = 1.0;
  public isPlaying: boolean = false;
  public crossfadeDuration: number = 3000;
  public activeCrossfade: CrossfadeInfo | null = null;

  async loadTrack(filePath: string, name: string | null = null): Promise<string> {
    const id = `track-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const trackName = name || filePath.split('/').pop() || 'unknown';
    const track = new MockAudioTrack(id, trackName, filePath);
    this.tracks.set(id, track);
    this.emit('track_loaded', { trackId: id, name: trackName });
    return id;
  }

  async playTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    await track.play();
    this.emit('track_playing', { trackId });
  }

  async stopTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    await track.stop();
    this.emit('track_stopped', { trackId });
  }

  setTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    track.setVolume(volume);
  }

  setTrackPan(trackId: string, pan: number): void {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    track.setPan(pan);
  }

  setTrackMute(trackId: string, muted: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    track.setMute(muted);
  }

  deleteTrack(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    if (!track) return false;
    track.destroy();
    this.tracks.delete(trackId);
    return true;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.emit('master_volume_changed', { volume: this.masterVolume });
  }

  createSong(name: string, trackIds: string[]): string {
    const id = `song-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.songs.set(id, { id, name, trackIds, isPlaying: false });
    return id;
  }

  async playSong(songId: string): Promise<void> {
    const song = this.songs.get(songId);
    if (!song) throw new Error(`Song ${songId} not found`);
    
    song.isPlaying = true;
    this.currentSongId = songId;
    
    for (const trackId of song.trackIds) {
      await this.playTrack(trackId).catch(() => {});
    }
    
    this.emit('song_playing', { songId });
  }

  async stopSong(songId: string): Promise<void> {
    const song = this.songs.get(songId);
    if (!song) throw new Error(`Song ${songId} not found`);
    
    song.isPlaying = false;
    if (this.currentSongId === songId) {
      this.currentSongId = null;
    }
    
    for (const trackId of song.trackIds) {
      await this.stopTrack(trackId).catch(() => {});
    }
    
    this.emit('song_stopped', { songId });
  }

  deleteSong(songId: string): boolean {
    return this.songs.delete(songId);
  }

  stopAllTracks(): void {
    for (const track of this.tracks.values()) {
      track.stop().catch(() => {});
    }
  }

  clearAllTracks(): void {
    for (const track of this.tracks.values()) {
      track.destroy();
    }
    this.tracks.clear();
  }

  getState(): MixerState {
    return {
      masterVolume: this.masterVolume,
      isPlaying: this.isPlaying,
      currentSongId: this.currentSongId,
      songs: Array.from(this.songs.values()).map(song => ({
        id: song.id,
        name: song.name,
        isPlaying: song.isPlaying,
        trackCount: song.trackIds.length,
        tracks: song.trackIds.map(tid => {
          const track = this.tracks.get(tid);
          return track ? {
            id: track.id,
            name: track.name,
            isPlaying: track.isPlaying,
            volume: track.volume,
            pan: track.pan,
            isMuted: track.isMuted
          } : null;
        }).filter(Boolean) as any[]
      })),
      tracks: Array.from(this.tracks.values()).map(t => t.getState()),
      memoryUsage: {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0
      }
    };
  }

  getMemoryUsage() {
    return {
      rss: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    };
  }
}

/**
 * Mock Audic (audio player) implementation
 */
export class MockAudic extends EventEmitter {
  public src: string;
  public playing: boolean = false;
  public paused: boolean = false;
  public currentTime: number = 0;
  public duration: number = 180;
  public volume: number = 1.0;

  constructor(src: string) {
    super();
    this.src = src;
  }

  async play(): Promise<void> {
    this.playing = true;
    this.paused = false;
    this.emit('play');
  }

  pause(): void {
    this.playing = false;
    this.paused = true;
    this.emit('pause');
  }

  stop(): void {
    this.playing = false;
    this.paused = false;
    this.currentTime = 0;
    this.emit('stop');
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create mock Socket.IO server for audio service tests
 */
export function createMockSocketServer() {
  const clients: any[] = [];
  const eventHandlers: Map<string, Set<Function>> = new Map();

  const mockIo = {
    on(event: string, handler: Function) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    },
    emit(event: string, ...args: any[]) {
      clients.forEach(client => {
        if (client.emit) client.emit(event, ...args);
      });
    },
    _simulateConnection(mockClient: any) {
      clients.push(mockClient);
      const handlers = eventHandlers.get('connection');
      if (handlers) {
        handlers.forEach(h => h(mockClient));
      }
    },
    _getClients() {
      return clients;
    }
  };

  return mockIo;
}

/**
 * Factory function to create mock Socket.IO client
 */
export function createMockSocketClient() {
  const eventHandlers: Map<string, Set<Function>> = new Map();
  const emittedEvents: Array<{ event: string; data: any }> = [];

  return {
    id: `client-${Date.now()}`,
    on(event: string, handler: Function) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    },
    emit(event: string, ...args: any[]) {
      emittedEvents.push({ event, data: args });
    },
    _trigger(event: string, ...args: any[]) {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(h => h(...args));
      }
    },
    _getEmittedEvents() {
      return emittedEvents;
    },
    _clearEmittedEvents() {
      emittedEvents.length = 0;
    }
  };
}
