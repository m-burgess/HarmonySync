/**
 * Integration Test: Load and Play Song Workflow
 * 
 * Tests the complete workflow of:
 * 1. Adding a folder to setlist
 * 2. Loading a song with tracks
 * 3. Playing audio
 * 4. Stopping audio
 * 
 * This test verifies that multiple ViewModels work together correctly.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Container from '../../di/Container.js';
import IpcService from '../../services/IpcService.js';
import AudioService from '../../services/AudioService.js';
import SetlistService from '../../services/SetlistService.js';
import FileService from '../../services/FileService.js';
import DisplayService from '../../services/DisplayService.js';
import SlideService from '../../services/SlideService.js';
import EventBusService from '../../services/EventBusService.js';
import AudioViewModel from '../../viewmodels/AudioViewModel.js';
import SetlistViewModel from '../../viewmodels/SetlistViewModel.js';

describe('Integration: Load and Play Song Workflow', () => {
  let container;
  let audioViewModel;
  let setlistViewModel;
  let eventBus;
  let mockIpcService;

  beforeEach(() => {
    // Create fresh DI container
    container = new Container();

    // Create mock IPC service
    mockIpcService = {
      invoke: vi.fn(),
      listen: vi.fn(() => () => {}), // Return unlisten function
      emit: vi.fn(),
    };

    // Register services with mocked IPC
    container.registerInstance('ipcService', mockIpcService);
    container.register('eventBusService', EventBusService, [], true);
    container.register('audioService', AudioService, ['ipcService'], true);
    container.register('fileService', FileService, ['ipcService'], true);
    container.register('displayService', DisplayService, ['ipcService'], true);
    container.register('slideService', SlideService, ['ipcService'], true);
    container.register('setlistService', SetlistService, ['ipcService', 'fileService'], true);

    // Register ViewModels
    container.register('audioViewModel', AudioViewModel, ['audioService'], true);
    container.register('setlistViewModel', SetlistViewModel, 
      ['setlistService', 'audioService', 'displayService', 'slideService'], true);

    // Resolve ViewModels
    audioViewModel = container.resolve('audioViewModel');
    setlistViewModel = container.resolve('setlistViewModel');
    eventBus = container.resolve('eventBusService');
  });

  afterEach(() => {
    container.clear();
    vi.clearAllMocks();
  });

  it('should complete full load and play workflow', async () => {
    // Mock IPC responses
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'select_folder':
          return '/path/to/song';
        case 'get_song_metadata':
          return {
            name: 'Amazing Grace',
            tracks: ['vocals.mp3', 'piano.mp3', 'drums.mp3'],
            slides: ['slide1.png', 'slide2.png']
          };
        case 'load_audio_tracks':
          return [
            { name: 'vocals.mp3', path: '/path/to/song/vocals.mp3', duration: 180 },
            { name: 'piano.mp3', path: '/path/to/song/piano.mp3', duration: 180 },
            { name: 'drums.mp3', path: '/path/to/song/drums.mp3', duration: 180 },
          ];
        case 'audio_service_play':
          return { success: true };
        case 'audio_service_stop':
          return { success: true };
        default:
          return null;
      }
    });

    // Step 1: Add folder to setlist
    await setlistViewModel.addFolders();

    expect(setlistViewModel.setlist.length).toBe(1);
    expect(setlistViewModel.setlist[0].name).toBe('Amazing Grace');
    expect(mockIpcService.invoke).toHaveBeenCalledWith('select_folder');

    // Step 2: Load song with tracks
    const loadedItem = setlistViewModel.setlist[0];
    await setlistViewModel.loadItem(loadedItem, 0);

    expect(setlistViewModel.currentSongIndex).toBe(0);
    expect(setlistViewModel.currentLoadedFolder).toBe('/path/to/song');

    // Verify tracks were loaded (this would normally happen through callbacks)
    // In real app, SetlistManager calls setAllTracks which updates AudioViewModel
    expect(mockIpcService.invoke).toHaveBeenCalledWith('load_audio_tracks', '/path/to/song');

    // Step 3: Load tracks into audio ViewModel
    await audioViewModel.loadTracks('/path/to/song');

    expect(audioViewModel.tracks.length).toBe(3);
    expect(audioViewModel.tracks[0].name).toBe('vocals.mp3');
    expect(audioViewModel.tracks[1].name).toBe('piano.mp3');
    expect(audioViewModel.tracks[2].name).toBe('drums.mp3');

    // Step 4: Play audio
    await audioViewModel.play();

    expect(audioViewModel.isPlaying).toBe(true);
    expect(audioViewModel.isPaused).toBe(false);
    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio_service_play');

    // Step 5: Stop audio
    await audioViewModel.stop();

    expect(audioViewModel.isPlaying).toBe(false);
    expect(audioViewModel.currentPosition).toBe(0);
    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio_service_stop');
  });

  it('should handle multiple songs in sequence', async () => {
    // Mock responses for two songs
    let folderCallCount = 0;
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'select_folder':
          folderCallCount++;
          return folderCallCount === 1 ? '/path/to/song1' : '/path/to/song2';
        case 'get_song_metadata':
          const songPath = args[0];
          if (songPath.includes('song1')) {
            return { name: 'Song 1', tracks: ['track1.mp3'], slides: [] };
          } else {
            return { name: 'Song 2', tracks: ['track2.mp3'], slides: [] };
          }
        case 'load_audio_tracks':
          const trackPath = args[0];
          if (trackPath.includes('song1')) {
            return [{ name: 'track1.mp3', path: '/path/to/song1/track1.mp3', duration: 120 }];
          } else {
            return [{ name: 'track2.mp3', path: '/path/to/song2/track2.mp3', duration: 150 }];
          }
        case 'audio_service_play':
        case 'audio_service_stop':
          return { success: true };
        default:
          return null;
      }
    });

    // Add two songs to setlist
    await setlistViewModel.addFolders();
    await setlistViewModel.addFolders();

    expect(setlistViewModel.setlist.length).toBe(2);

    // Load and play first song
    await setlistViewModel.loadItem(setlistViewModel.setlist[0], 0);
    await audioViewModel.loadTracks('/path/to/song1');
    await audioViewModel.play();

    expect(setlistViewModel.currentSongIndex).toBe(0);
    expect(audioViewModel.tracks[0].name).toBe('track1.mp3');
    expect(audioViewModel.isPlaying).toBe(true);

    // Stop and switch to second song
    await audioViewModel.stop();
    await setlistViewModel.loadItem(setlistViewModel.setlist[1], 1);
    await audioViewModel.loadTracks('/path/to/song2');
    await audioViewModel.play();

    expect(setlistViewModel.currentSongIndex).toBe(1);
    expect(audioViewModel.tracks[0].name).toBe('track2.mp3');
    expect(audioViewModel.isPlaying).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Mock error responses
    mockIpcService.invoke.mockImplementation(async (command) => {
      if (command === 'select_folder') {
        throw new Error('User cancelled folder selection');
      }
      return null;
    });

    // Try to add folder - should handle error
    await setlistViewModel.addFolders();

    expect(setlistViewModel.setlist.length).toBe(0);
    expect(setlistViewModel.isLoading).toBe(false);
  });

  it('should use EventBus for cross-component communication', async () => {
    const trackLoadedHandler = vi.fn();
    const playbackStartedHandler = vi.fn();

    // Subscribe to events
    eventBus.subscribe('audio:track-loaded', trackLoadedHandler);
    eventBus.subscribe('audio:playback-started', playbackStartedHandler);

    // Mock successful responses
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'load_audio_tracks':
          return [{ name: 'test.mp3', path: '/test.mp3', duration: 100 }];
        case 'audio_service_play':
          return { success: true };
        default:
          return null;
      }
    });

    // Load tracks and trigger event
    await audioViewModel.loadTracks('/test/path');
    eventBus.publish('audio:track-loaded', { count: audioViewModel.tracks.length });

    // Play and trigger event
    await audioViewModel.play();
    eventBus.publish('audio:playback-started');

    expect(trackLoadedHandler).toHaveBeenCalledWith({ count: 1 });
    expect(playbackStartedHandler).toHaveBeenCalled();
  });
});
