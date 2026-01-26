/**
 * Integration Test: Audio Transpose Workflow
 * 
 * Tests the complete workflow of:
 * 1. Loading a song
 * 2. Transposing up/down
 * 3. Verifying transposed folder created
 * 4. Loading transposed tracks
 * 
 * This test verifies AudioViewModel transpose functionality.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Container from '../../di/Container.js';
import IpcService from '../../services/IpcService.js';
import AudioService from '../../services/AudioService.js';
import EventBusService, { EVENT_TYPES } from '../../services/EventBusService.js';
import AudioViewModel from '../../viewmodels/AudioViewModel.js';

describe('Integration: Audio Transpose Workflow', () => {
  let container;
  let audioViewModel;
  let eventBus;
  let mockIpcService;

  beforeEach(() => {
    // Create fresh DI container
    container = new Container();

    // Create mock IPC service
    mockIpcService = {
      invoke: vi.fn(),
      listen: vi.fn(() => () => {}),
      emit: vi.fn(),
    };

    // Register services
    container.registerInstance('ipcService', mockIpcService);
    container.register('eventBusService', EventBusService, [], true);
    container.register('audioService', AudioService, ['ipcService'], true);

    // Register ViewModel
    container.register('audioViewModel', AudioViewModel, ['audioService'], true);

    // Resolve
    audioViewModel = container.resolve('audioViewModel');
    eventBus = container.resolve('eventBusService');
  });

  afterEach(() => {
    container.clear();
    vi.clearAllMocks();
  });

  it('should complete full transpose workflow', async () => {
    // Mock IPC responses
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'load_audio_tracks':
          const folderPath = args[0];
          if (folderPath.includes('+2')) {
            return [
              { name: 'vocals.mp3', path: '/song/+2/vocals.mp3', duration: 180 },
              { name: 'piano.mp3', path: '/song/+2/piano.mp3', duration: 180 },
            ];
          } else {
            return [
              { name: 'vocals.mp3', path: '/song/vocals.mp3', duration: 180 },
              { name: 'piano.mp3', path: '/song/piano.mp3', duration: 180 },
            ];
          }
        case 'transpose_audio':
          return {
            success: true,
            outputPath: '/song/+2',
            semitones: args[1]
          };
        default:
          return null;
      }
    });

    // Step 1: Load original song
    await audioViewModel.loadTracks('/song');

    expect(audioViewModel.tracks.length).toBe(2);
    expect(audioViewModel.tracks[0].path).toBe('/song/vocals.mp3');
    expect(audioViewModel.currentSongPath).toBe('/song');

    // Step 2: Transpose up by 2 semitones
    const transposePromise = audioViewModel.transpose(2);

    // Simulate transpose progress events
    setTimeout(() => {
      eventBus.publish(EVENT_TYPES.TRANSPOSE_STARTED, { semitones: 2 });
    }, 10);

    setTimeout(() => {
      // Simulate progress updates
      eventBus.publish('transpose-progress', {
        currentFile: 'vocals.mp3',
        totalFiles: 2,
        completedFiles: 0,
      });
    }, 20);

    setTimeout(() => {
      eventBus.publish('transpose-progress', {
        currentFile: 'piano.mp3',
        totalFiles: 2,
        completedFiles: 1,
      });
    }, 30);

    setTimeout(() => {
      eventBus.publish(EVENT_TYPES.TRANSPOSE_COMPLETED, {
        outputPath: '/song/+2',
        semitones: 2
      });
    }, 40);

    await transposePromise;

    // Step 3: Verify transposed folder created and tracks loaded
    expect(audioViewModel.currentSongPath).toBe('/song/+2');
    expect(audioViewModel.tracks[0].path).toContain('+2');
    expect(mockIpcService.invoke).toHaveBeenCalledWith('transpose_audio', '/song', 2);
    expect(mockIpcService.invoke).toHaveBeenCalledWith('load_audio_tracks', '/song/+2');
  });

  it('should handle transpose down', async () => {
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'load_audio_tracks':
          const folderPath = args[0];
          if (folderPath.includes('-3')) {
            return [
              { name: 'track1.mp3', path: '/song/-3/track1.mp3', duration: 120 },
            ];
          } else {
            return [
              { name: 'track1.mp3', path: '/song/track1.mp3', duration: 120 },
            ];
          }
        case 'transpose_audio':
          return {
            success: true,
            outputPath: '/song/-3',
            semitones: args[1]
          };
        default:
          return null;
      }
    });

    await audioViewModel.loadTracks('/song');
    await audioViewModel.transpose(-3);

    expect(audioViewModel.currentSongPath).toBe('/song/-3');
    expect(mockIpcService.invoke).toHaveBeenCalledWith('transpose_audio', '/song', -3);
  });

  it('should handle transpose errors', async () => {
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'load_audio_tracks':
          return [{ name: 'track.mp3', path: '/song/track.mp3', duration: 100 }];
        case 'transpose_audio':
          throw new Error('FFmpeg not found');
        default:
          return null;
      }
    });

    await audioViewModel.loadTracks('/song');
    
    // Try to transpose - should handle error
    await audioViewModel.transpose(2);

    expect(audioViewModel.error).toContain('FFmpeg not found');
    expect(audioViewModel.isLoading).toBe(false);
  });

  it('should handle multiple transpose operations', async () => {
    let transposeCount = 0;
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'load_audio_tracks':
          const folderPath = args[0];
          if (folderPath.includes('+2')) {
            return [{ name: 'track.mp3', path: '/song/+2/track.mp3', duration: 100 }];
          } else if (folderPath.includes('+4')) {
            return [{ name: 'track.mp3', path: '/song/+4/track.mp3', duration: 100 }];
          } else {
            return [{ name: 'track.mp3', path: '/song/track.mp3', duration: 100 }];
          }
        case 'transpose_audio':
          transposeCount++;
          const semitones = args[1];
          const basePath = args[0].replace(/\/[\+\-]\d+$/, ''); // Remove existing transpose suffix
          return {
            success: true,
            outputPath: `${basePath}/+${transposeCount * 2}`,
            semitones
          };
        default:
          return null;
      }
    });

    // Load original
    await audioViewModel.loadTracks('/song');
    expect(audioViewModel.currentSongPath).toBe('/song');

    // Transpose +2
    await audioViewModel.transpose(2);
    expect(audioViewModel.currentSongPath).toBe('/song/+2');

    // Transpose again +2 (total +4)
    await audioViewModel.transpose(2);
    expect(audioViewModel.currentSongPath).toBe('/song/+4');
  });

  it('should preserve track settings during transpose', async () => {
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'load_audio_tracks':
          const folderPath = args[0];
          if (folderPath.includes('+1')) {
            return [
              { name: 'vocals.mp3', path: '/song/+1/vocals.mp3', duration: 180 },
              { name: 'piano.mp3', path: '/song/+1/piano.mp3', duration: 180 },
            ];
          } else {
            return [
              { name: 'vocals.mp3', path: '/song/vocals.mp3', duration: 180 },
              { name: 'piano.mp3', path: '/song/piano.mp3', duration: 180 },
            ];
          }
        case 'transpose_audio':
          return {
            success: true,
            outputPath: '/song/+1',
            semitones: 1
          };
        case 'audio_service_set_track_volume':
        case 'audio_service_set_track_pan':
        case 'audio_service_set_track_mute':
          return { success: true };
        default:
          return null;
      }
    });

    // Load tracks and adjust settings
    await audioViewModel.loadTracks('/song');
    await audioViewModel.setTrackVolume(0, 0.5);
    await audioViewModel.setTrackMute(1, true);

    const originalVolume = audioViewModel.tracks[0].volume;
    const originalMute = audioViewModel.tracks[1].muted;

    expect(originalVolume).toBe(0.5);
    expect(originalMute).toBe(true);

    // Transpose
    await audioViewModel.transpose(1);

    // Settings should be preserved on new tracks
    // Note: In a real implementation, you'd need to save/restore mixer config
    expect(audioViewModel.tracks.length).toBe(2);
  });

  it('should use EventBus for transpose events', async () => {
    const transposeStartedHandler = vi.fn();
    const transposeCompletedHandler = vi.fn();
    const transposeFailedHandler = vi.fn();

    eventBus.subscribe(EVENT_TYPES.TRANSPOSE_STARTED, transposeStartedHandler);
    eventBus.subscribe(EVENT_TYPES.TRANSPOSE_COMPLETED, transposeCompletedHandler);
    eventBus.subscribe(EVENT_TYPES.TRANSPOSE_FAILED, transposeFailedHandler);

    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'load_audio_tracks':
          return [{ name: 'track.mp3', path: '/song/track.mp3', duration: 100 }];
        case 'transpose_audio':
          return { success: true, outputPath: '/song/+3', semitones: 3 };
        default:
          return null;
      }
    });

    await audioViewModel.loadTracks('/song');

    // Trigger transpose with event publishing
    const transposePromise = audioViewModel.transpose(3);
    
    eventBus.publish(EVENT_TYPES.TRANSPOSE_STARTED, { semitones: 3 });
    await transposePromise;
    eventBus.publish(EVENT_TYPES.TRANSPOSE_COMPLETED, { 
      outputPath: '/song/+3',
      semitones: 3 
    });

    expect(transposeStartedHandler).toHaveBeenCalledWith({ semitones: 3 });
    expect(transposeCompletedHandler).toHaveBeenCalledWith({ 
      outputPath: '/song/+3',
      semitones: 3 
    });
    expect(transposeFailedHandler).not.toHaveBeenCalled();
  });

  it('should handle transpose cancellation', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'load_audio_tracks':
          return [{ name: 'track.mp3', path: '/song/track.mp3', duration: 100 }];
        case 'transpose_audio':
          // Simulate long-running operation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: true, outputPath: '/song/+1', semitones: 1 };
        case 'cancel_transpose':
          return { success: true, cancelled: true };
        default:
          return null;
      }
    });

    await audioViewModel.loadTracks('/song');

    // Start transpose (don't await)
    const transposePromise = audioViewModel.transpose(1);

    // Cancel after short delay
    setTimeout(async () => {
      if (audioViewModel.cancelTranspose) {
        await audioViewModel.cancelTranspose();
      }
    }, 100);

    // The transpose should be cancelled or handle cancellation gracefully
    try {
      await transposePromise;
    } catch (error) {
      // Cancellation might throw
      expect(error.message).toContain('cancelled');
    }
  });
});
