/**
 * AudioViewModel Tests
 * 
 * These tests demonstrate how ViewModels are easy to test
 * because they're plain JavaScript classes with no React dependencies.
 */
import AudioViewModel from '../../viewmodels/AudioViewModel';

describe('AudioViewModel', () => {
  let audioViewModel;
  let mockAudioService;

  beforeEach(() => {
    // Create mock audio service
    mockAudioService = {
      loadTracks: jest.fn(),
      transpose: jest.fn(),
      play: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      seek: jest.fn(),
      setTrackVolume: jest.fn(),
      setTrackPan: jest.fn(),
      setTrackMute: jest.fn(),
      saveMixerConfig: jest.fn(),
      loadMixerConfig: jest.fn(),
      getMemoryUsage: jest.fn(),
      cleanup: jest.fn(),
      onPositionUpdate: jest.fn(() => () => {}),
      onStateChange: jest.fn(() => () => {}),
      // New methods for refactored functionality
      initializeAudioService: jest.fn().mockResolvedValue(),
      getTracks: jest.fn(() => []),
      clearTracks: jest.fn().mockResolvedValue(),
      addTracks: jest.fn().mockResolvedValue([]),
      playAllTracks: jest.fn().mockResolvedValue(),
      stopAllAudio: jest.fn().mockResolvedValue(),
      goToBeginningAllTracks: jest.fn().mockResolvedValue(),
      setGlobalVolume: jest.fn().mockResolvedValue(),
      setTrackMuteState: jest.fn().mockResolvedValue(),
      setTrackPanValue: jest.fn().mockResolvedValue(),
      startAudioServiceFromApp: jest.fn().mockResolvedValue({ success: true }),
      checkAudioServiceStatus: jest.fn().mockResolvedValue(true),
      getAudioServiceHealth: jest.fn().mockResolvedValue({ status: 'ok' }),
      getServiceChecker: jest.fn(() => ({})),
      startMemoryMonitoring: jest.fn(),
      stopMemoryMonitoring: jest.fn(),
      cleanupAndStopAudio: jest.fn().mockResolvedValue()
    };

    // Create ViewModel with mock service
    audioViewModel = new AudioViewModel(mockAudioService);
  });

  describe('initial state', () => {
    test('has empty track list', () => {
      expect(audioViewModel.tracks).toEqual([]);
    });

    test('is not playing', () => {
      expect(audioViewModel.isPlaying).toBe(false);
    });

    test('has no tracks loaded', () => {
      expect(audioViewModel.hasTracksLoaded).toBe(false);
    });
  });

  describe('loadTracks', () => {
    test('loads tracks successfully', async () => {
      // Arrange
      const mockTracks = [
        { name: 'Track 1', path: '/path/1.ogg' },
        { name: 'Track 2', path: '/path/2.ogg' }
      ];
      mockAudioService.loadTracks.mockResolvedValue(mockTracks);
      mockAudioService.loadMixerConfig.mockResolvedValue(null);

      // Act
      await audioViewModel.loadTracks('/songs/song1');

      // Assert
      expect(mockAudioService.loadTracks).toHaveBeenCalledWith('/songs/song1');
      expect(audioViewModel.tracks).toHaveLength(2);
      expect(audioViewModel.tracks[0].name).toBe('Track 1');
      expect(audioViewModel.tracks[0].volume).toBe(1.0);
      expect(audioViewModel.tracks[0].pan).toBe(0);
      expect(audioViewModel.tracks[0].muted).toBe(false);
      expect(audioViewModel.hasTracksLoaded).toBe(true);
      expect(audioViewModel.currentSongPath).toBe('/songs/song1');
    });

    test('handles load error', async () => {
      // Arrange
      mockAudioService.loadTracks.mockRejectedValue(new Error('Failed to load'));

      // Act
      await audioViewModel.loadTracks('/songs/song1');

      // Assert
      expect(audioViewModel.error).toBe('Failed to load');
      expect(audioViewModel.tracks).toEqual([]);
    });
  });

  describe('playback controls', () => {
    test('play() sets isPlaying to true', async () => {
      // Arrange
      mockAudioService.play.mockResolvedValue();

      // Act
      await audioViewModel.play();

      // Assert
      expect(mockAudioService.play).toHaveBeenCalled();
      expect(audioViewModel.isPlaying).toBe(true);
      expect(audioViewModel.isPaused).toBe(false);
    });

    test('pause() sets isPaused to true', async () => {
      // Arrange
      mockAudioService.pause.mockResolvedValue();

      // Act
      await audioViewModel.pause();

      // Assert
      expect(mockAudioService.pause).toHaveBeenCalled();
      expect(audioViewModel.isPaused).toBe(true);
      expect(audioViewModel.isPlaying).toBe(false);
    });

    test('stop() resets playback state', async () => {
      // Arrange
      mockAudioService.stop.mockResolvedValue();
      audioViewModel.isPlaying = true;
      audioViewModel.currentPosition = 30;

      // Act
      await audioViewModel.stop();

      // Assert
      expect(mockAudioService.stop).toHaveBeenCalled();
      expect(audioViewModel.isPlaying).toBe(false);
      expect(audioViewModel.isPaused).toBe(false);
      expect(audioViewModel.currentPosition).toBe(0);
    });
  });

  describe('track controls', () => {
    beforeEach(async () => {
      // Load some tracks first
      const mockTracks = [
        { name: 'Track 1', path: '/path/1.ogg' }
      ];
      mockAudioService.loadTracks.mockResolvedValue(mockTracks);
      mockAudioService.loadMixerConfig.mockResolvedValue(null);
      await audioViewModel.loadTracks('/songs/song1');
    });

    test('setTrackVolume updates track volume', async () => {
      // Arrange
      mockAudioService.setTrackVolume.mockResolvedValue();

      // Act
      await audioViewModel.setTrackVolume(0, 0.5);

      // Assert
      expect(mockAudioService.setTrackVolume).toHaveBeenCalledWith(0, 0.5);
      expect(audioViewModel.tracks[0].volume).toBe(0.5);
    });

    test('setTrackPan updates track pan', async () => {
      // Arrange
      mockAudioService.setTrackPan.mockResolvedValue();

      // Act
      await audioViewModel.setTrackPan(0, -1);

      // Assert
      expect(mockAudioService.setTrackPan).toHaveBeenCalledWith(0, -1);
      expect(audioViewModel.tracks[0].pan).toBe(-1);
    });

    test('toggleTrackMute toggles mute state', async () => {
      // Arrange
      mockAudioService.setTrackMute.mockResolvedValue();
      expect(audioViewModel.tracks[0].muted).toBe(false);

      // Act - first toggle
      await audioViewModel.toggleTrackMute(0);

      // Assert - should be muted
      expect(mockAudioService.setTrackMute).toHaveBeenCalledWith(0, true);
      expect(audioViewModel.tracks[0].muted).toBe(true);

      // Act - second toggle
      await audioViewModel.toggleTrackMute(0);

      // Assert - should be unmuted
      expect(mockAudioService.setTrackMute).toHaveBeenCalledWith(0, false);
      expect(audioViewModel.tracks[0].muted).toBe(false);
    });
  });

  describe('computed properties', () => {
    test('formattedPosition formats time correctly', () => {
      audioViewModel.currentPosition = 125; // 2:05
      expect(audioViewModel.formattedPosition).toBe('2:05');
    });

    test('formattedDuration formats time correctly', () => {
      audioViewModel.duration = 195; // 3:15
      expect(audioViewModel.formattedDuration).toBe('3:15');
    });

    test('progressPercentage calculates correctly', () => {
      audioViewModel.currentPosition = 30;
      audioViewModel.duration = 100;
      expect(audioViewModel.progressPercentage).toBe(30);
    });

    test('progressPercentage handles zero duration', () => {
      audioViewModel.currentPosition = 30;
      audioViewModel.duration = 0;
      expect(audioViewModel.progressPercentage).toBe(0);
    });
  });

  describe('transpose', () => {
    test('transposes and reloads tracks', async () => {
      // Arrange
      audioViewModel.currentSongPath = '/songs/song1';
      mockAudioService.transpose.mockResolvedValue({
        success: true,
        outputPath: '/songs/song1_+2'
      });
      const mockTracks = [{ name: 'Track 1', path: '/path/1.ogg' }];
      mockAudioService.loadTracks.mockResolvedValue(mockTracks);
      mockAudioService.loadMixerConfig.mockResolvedValue(null);

      // Act
      await audioViewModel.transpose(2);

      // Assert
      expect(mockAudioService.transpose).toHaveBeenCalledWith('/songs/song1', 2);
      expect(mockAudioService.loadTracks).toHaveBeenCalledWith('/songs/song1_+2');
    });

    test('handles transpose error', async () => {
      // Arrange
      audioViewModel.currentSongPath = '/songs/song1';
      mockAudioService.transpose.mockResolvedValue({
        success: false
      });

      // Act
      await audioViewModel.transpose(2);

      // Assert
      expect(audioViewModel.error).toBe('Transpose failed');
    });
  });

  describe('playAll', () => {
    test('plays all tracks with operation lock', async () => {
      mockAudioService.playAllTracks = jest.fn().mockResolvedValue();
      
      await audioViewModel.playAll();
      
      expect(mockAudioService.playAllTracks).toHaveBeenCalled();
      expect(audioViewModel.isPlaying).toBe(true);
      expect(audioViewModel.isPaused).toBe(false);
    });

    test('prevents concurrent operations', async () => {
      mockAudioService.playAllTracks = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      audioViewModel.isOperationInProgress = true;
      await audioViewModel.playAll();
      
      expect(mockAudioService.playAllTracks).not.toHaveBeenCalled();
    });
  });

  describe('stopAll', () => {
    test('stops all tracks', async () => {
      mockAudioService.stopAllAudio = jest.fn().mockResolvedValue();
      
      await audioViewModel.stopAll();
      
      expect(mockAudioService.stopAllAudio).toHaveBeenCalled();
      expect(audioViewModel.isPlaying).toBe(false);
      expect(audioViewModel.isPaused).toBe(false);
      expect(audioViewModel.currentPosition).toBe(0);
    });
  });

  describe('setGlobalVolume', () => {
    test('sets global volume', async () => {
      mockAudioService.setGlobalVolume = jest.fn().mockResolvedValue();
      
      await audioViewModel.setGlobalVolume(0.7);
      
      expect(mockAudioService.setGlobalVolume).toHaveBeenCalledWith(0.7);
      expect(audioViewModel.globalVolume).toBe(0.7);
    });
  });

  describe('cleanup', () => {
    test('resets all state', async () => {
      // Arrange
      audioViewModel.tracks = [{ name: 'Track 1' }];
      audioViewModel.isPlaying = true;
      audioViewModel.currentPosition = 30;
      audioViewModel.currentSongPath = '/songs/song1';
      mockAudioService.cleanup.mockResolvedValue();

      // Act
      await audioViewModel.cleanup();

      // Assert
      expect(mockAudioService.cleanup).toHaveBeenCalled();
      expect(audioViewModel.tracks).toEqual([]);
      expect(audioViewModel.isPlaying).toBe(false);
      expect(audioViewModel.currentPosition).toBe(0);
      expect(audioViewModel.currentSongPath).toBeNull();
    });
  });
});
