/**
 * MixerViewModel Tests
 * 
 * These tests demonstrate how ViewModels are easy to test
 * because they're plain JavaScript classes with no React dependencies.
 */
import MixerViewModel from '../../viewmodels/MixerViewModel';

describe('MixerViewModel', () => {
  let mixerViewModel;
  let mockAudioService;

  beforeEach(() => {
    // Create mock audio service
    mockAudioService = {
      play: jest.fn(),
      stop: jest.fn(),
      setTrackMute: jest.fn(),
      onStateChange: jest.fn(() => () => {})
    };

    // Create ViewModel with mock service
    mixerViewModel = new MixerViewModel(mockAudioService);
  });

  describe('initial state', () => {
    test('has empty track list', () => {
      expect(mixerViewModel.tracks).toEqual([]);
    });

    test('has empty mute states', () => {
      expect(mixerViewModel.muteStates).toEqual({});
    });

    test('is not playing', () => {
      expect(mixerViewModel.isPlaying).toBe(false);
    });

    test('has no operation in progress', () => {
      expect(mixerViewModel.isOperationInProgress).toBe(false);
    });

    test('is not loading tracks', () => {
      expect(mixerViewModel.isLoadingTracks).toBe(false);
    });

    test('has no error', () => {
      expect(mixerViewModel.error).toBeNull();
    });
  });

  describe('computed properties', () => {
    test('hasTracks returns false when no tracks', () => {
      expect(mixerViewModel.hasTracks).toBe(false);
    });

    test('hasTracks returns true when tracks exist', () => {
      mixerViewModel.tracks = [{ id: '1', name: 'Track 1' }];
      expect(mixerViewModel.hasTracks).toBe(true);
    });

    test('canPlay returns true when has tracks and not in progress', () => {
      mixerViewModel.tracks = [{ id: '1', name: 'Track 1' }];
      expect(mixerViewModel.canPlay).toBe(true);
    });

    test('canPlay returns false when no tracks', () => {
      mixerViewModel.tracks = [];
      expect(mixerViewModel.canPlay).toBe(false);
    });

    test('canPlay returns false when operation in progress', () => {
      mixerViewModel.tracks = [{ id: '1', name: 'Track 1' }];
      mixerViewModel.isOperationInProgress = true;
      expect(mixerViewModel.canPlay).toBe(false);
    });

    test('canStop returns true when playing and not in progress', () => {
      mixerViewModel.isPlaying = true;
      expect(mixerViewModel.canStop).toBe(true);
    });

    test('canStop returns false when not playing', () => {
      mixerViewModel.isPlaying = false;
      expect(mixerViewModel.canStop).toBe(false);
    });

    test('canStop returns false when operation in progress', () => {
      mixerViewModel.isPlaying = true;
      mixerViewModel.isOperationInProgress = true;
      expect(mixerViewModel.canStop).toBe(false);
    });

    describe('sortedTracks', () => {
      test('sorts priority tracks first', () => {
        // Arrange
        mixerViewModel.tracks = [
          { id: '1', name: 'bass' },
          { id: '2', name: 'click' },
          { id: '3', name: 'vocals' },
          { id: '4', name: 'guide' }
        ];

        // Act
        const sorted = mixerViewModel.sortedTracks;

        // Assert
        expect(sorted[0].name).toBe('click');
        expect(sorted[1].name).toBe('guide');
        expect(sorted[2].name).toBe('bass');
        expect(sorted[3].name).toBe('vocals');
      });

      test('sorts non-priority tracks alphabetically', () => {
        // Arrange
        mixerViewModel.tracks = [
          { id: '1', name: 'Vocals' },
          { id: '2', name: 'Bass' },
          { id: '3', name: 'Drums' }
        ];

        // Act
        const sorted = mixerViewModel.sortedTracks;

        // Assert
        expect(sorted[0].name).toBe('Bass');
        expect(sorted[1].name).toBe('Drums');
        expect(sorted[2].name).toBe('Vocals');
      });

      test('handles mixed case in track names', () => {
        // Arrange
        mixerViewModel.tracks = [
          { id: '1', name: 'CLICK' },
          { id: '2', name: 'Guide' },
          { id: '3', name: 'vocals' }
        ];

        // Act
        const sorted = mixerViewModel.sortedTracks;

        // Assert
        expect(sorted[0].name).toBe('CLICK');
        expect(sorted[1].name).toBe('Guide');
        expect(sorted[2].name).toBe('vocals');
      });
    });
  });

  describe('setTracks', () => {
    test('sets tracks and initializes mute states', () => {
      // Arrange
      const tracks = [
        { id: 'track1', name: 'Track 1', isMuted: false },
        { id: 'track2', name: 'Track 2', isMuted: true }
      ];

      // Act
      mixerViewModel.setTracks(tracks);

      // Assert
      expect(mixerViewModel.tracks).toEqual(tracks);
      expect(mixerViewModel.muteStates['track1']).toBe(false);
      expect(mixerViewModel.muteStates['track2']).toBe(true);
    });

    test('preserves existing mute states when updating tracks', () => {
      // Arrange - set initial tracks with mute states
      mixerViewModel.tracks = [{ id: 'track1', name: 'Track 1' }];
      mixerViewModel.muteStates = { track1: true };

      // Act - update tracks
      const newTracks = [
        { id: 'track1', name: 'Track 1', isMuted: false }, // isMuted is false but we had it muted
        { id: 'track2', name: 'Track 2', isMuted: false }
      ];
      mixerViewModel.setTracks(newTracks);

      // Assert - should preserve track1's muted state
      expect(mixerViewModel.muteStates['track1']).toBe(true);
      expect(mixerViewModel.muteStates['track2']).toBe(false);
    });

    test('handles null tracks', () => {
      // Act
      mixerViewModel.setTracks(null);

      // Assert
      expect(mixerViewModel.tracks).toEqual([]);
    });

    test('handles tracks without isMuted property', () => {
      // Arrange
      const tracks = [
        { id: 'track1', name: 'Track 1' }
      ];

      // Act
      mixerViewModel.setTracks(tracks);

      // Assert
      expect(mixerViewModel.muteStates['track1']).toBe(false);
    });
  });

  describe('syncTracks', () => {
    test('syncs tracks from external source', () => {
      // Arrange
      const tracks = [
        { id: 'track1', name: 'Track 1', isMuted: false }
      ];

      // Act
      mixerViewModel.syncTracks(tracks);

      // Assert
      expect(mixerViewModel.tracks).toEqual(tracks);
      expect(mixerViewModel.muteStates['track1']).toBe(false);
    });
  });

  describe('toggleMute', () => {
    beforeEach(() => {
      mixerViewModel.tracks = [
        { id: 'track1', name: 'Track 1', isMuted: false },
        { id: 'track2', name: 'Track 2', isMuted: false }
      ];
      mixerViewModel.muteStates = { track1: false, track2: false };
    });

    test('toggles track from unmuted to muted', async () => {
      // Arrange
      mockAudioService.setTrackMute.mockResolvedValue();

      // Act
      const result = await mixerViewModel.toggleMute(mixerViewModel.tracks[0]);

      // Assert
      expect(mockAudioService.setTrackMute).toHaveBeenCalledWith(0, true);
      expect(mixerViewModel.muteStates['track1']).toBe(true);
      expect(mixerViewModel.tracks[0].isMuted).toBe(true);
      expect(result).toBe(true);
    });

    test('toggles track from muted to unmuted', async () => {
      // Arrange
      mixerViewModel.muteStates['track1'] = true;
      mixerViewModel.tracks[0].isMuted = true;
      mockAudioService.setTrackMute.mockResolvedValue();

      // Act
      const result = await mixerViewModel.toggleMute(mixerViewModel.tracks[0]);

      // Assert
      expect(mockAudioService.setTrackMute).toHaveBeenCalledWith(0, false);
      expect(mixerViewModel.muteStates['track1']).toBe(false);
      expect(mixerViewModel.tracks[0].isMuted).toBe(false);
      expect(result).toBe(true);
    });

    test('handles toggle error', async () => {
      // Arrange
      mockAudioService.setTrackMute.mockRejectedValue(new Error('Mute failed'));

      // Act
      const result = await mixerViewModel.toggleMute(mixerViewModel.tracks[0]);

      // Assert
      expect(mixerViewModel.error).toBe('Mute failed');
      expect(result).toBe(false);
    });

    test('handles track not found', async () => {
      // Arrange
      const nonExistentTrack = { id: 'nonexistent', name: 'Ghost Track' };

      // Act
      const result = await mixerViewModel.toggleMute(nonExistentTrack);

      // Assert
      expect(mockAudioService.setTrackMute).not.toHaveBeenCalled();
      expect(mixerViewModel.error).toBe('Track not found');
      expect(result).toBe(false);
    });
  });

  describe('playAll', () => {
    beforeEach(() => {
      mixerViewModel.tracks = [{ id: 'track1', name: 'Track 1' }];
    });

    test('plays all tracks successfully', async () => {
      // Arrange
      mockAudioService.play.mockResolvedValue();

      // Act
      const result = await mixerViewModel.playAll();

      // Assert
      expect(mockAudioService.play).toHaveBeenCalled();
      expect(mixerViewModel.isPlaying).toBe(true);
      expect(mixerViewModel.isOperationInProgress).toBe(false);
      expect(result).toBe(true);
    });

    test('handles play error', async () => {
      // Arrange
      mockAudioService.play.mockRejectedValue(new Error('Play failed'));

      // Act
      const result = await mixerViewModel.playAll();

      // Assert
      expect(mixerViewModel.error).toBe('Play failed');
      expect(mixerViewModel.isPlaying).toBe(false);
      expect(mixerViewModel.isOperationInProgress).toBe(false);
      expect(result).toBe(false);
    });

    test('does nothing when no tracks', async () => {
      // Arrange
      mixerViewModel.tracks = [];

      // Act
      const result = await mixerViewModel.playAll();

      // Assert
      expect(mockAudioService.play).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('does nothing when operation in progress', async () => {
      // Arrange
      mixerViewModel.isOperationInProgress = true;

      // Act
      const result = await mixerViewModel.playAll();

      // Assert
      expect(mockAudioService.play).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('stopAll', () => {
    beforeEach(() => {
      mixerViewModel.isPlaying = true;
    });

    test('stops all tracks successfully', async () => {
      // Arrange
      mockAudioService.stop.mockResolvedValue();

      // Act
      const result = await mixerViewModel.stopAll();

      // Assert
      expect(mockAudioService.stop).toHaveBeenCalled();
      expect(mixerViewModel.isPlaying).toBe(false);
      expect(mixerViewModel.isOperationInProgress).toBe(false);
      expect(result).toBe(true);
    });

    test('handles stop error', async () => {
      // Arrange
      mockAudioService.stop.mockRejectedValue(new Error('Stop failed'));

      // Act
      const result = await mixerViewModel.stopAll();

      // Assert
      expect(mixerViewModel.error).toBe('Stop failed');
      expect(mixerViewModel.isOperationInProgress).toBe(false);
      expect(result).toBe(false);
    });

    test('does nothing when not playing', async () => {
      // Arrange
      mixerViewModel.isPlaying = false;

      // Act
      const result = await mixerViewModel.stopAll();

      // Assert
      expect(mockAudioService.stop).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('does nothing when operation in progress', async () => {
      // Arrange
      mixerViewModel.isOperationInProgress = true;

      // Act
      const result = await mixerViewModel.stopAll();

      // Assert
      expect(mockAudioService.stop).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('setLoadingTracks', () => {
    test('sets loading state to true', () => {
      // Act
      mixerViewModel.setLoadingTracks(true);

      // Assert
      expect(mixerViewModel.isLoadingTracks).toBe(true);
    });

    test('sets loading state to false', () => {
      // Arrange
      mixerViewModel.isLoadingTracks = true;

      // Act
      mixerViewModel.setLoadingTracks(false);

      // Assert
      expect(mixerViewModel.isLoadingTracks).toBe(false);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      mixerViewModel.tracks = [
        { id: 'track1', name: 'Track 1' },
        { id: 'track2', name: 'Track 2' }
      ];
      mixerViewModel.muteStates = { track1: true, track2: false };
    });

    test('isTrackMuted returns correct state', () => {
      // Assert
      expect(mixerViewModel.isTrackMuted('track1')).toBe(true);
      expect(mixerViewModel.isTrackMuted('track2')).toBe(false);
    });

    test('isTrackMuted returns false for unknown track', () => {
      // Assert
      expect(mixerViewModel.isTrackMuted('unknown')).toBe(false);
    });

    test('formatTrackName removes extension', () => {
      // Arrange
      const track = { name: 'vocals.mp3' };

      // Act
      const formatted = mixerViewModel.formatTrackName(track);

      // Assert
      expect(formatted).toBe('vocals');
    });

    test('formatTrackName handles multiple extensions', () => {
      // Arrange
      const extensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
      
      extensions.forEach(ext => {
        const track = { name: `track.${ext}` };
        const formatted = mixerViewModel.formatTrackName(track);
        expect(formatted).toBe('track');
      });
    });

    test('formatTrackName replaces dashes and underscores with spaces', () => {
      // Arrange
      const track = { name: 'lead_vocals-harmony.mp3' };

      // Act
      const formatted = mixerViewModel.formatTrackName(track);

      // Assert
      expect(formatted).toBe('lead vocals harmony');
    });

    test('formatTrackName handles null track', () => {
      // Act
      const formatted = mixerViewModel.formatTrackName(null);

      // Assert
      expect(formatted).toBe('Unknown Track');
    });

    test('formatTrackName handles track without name', () => {
      // Act
      const formatted = mixerViewModel.formatTrackName({});

      // Assert
      expect(formatted).toBe('Unknown Track');
    });

    test('getMuteIcon returns correct icon for muted track', () => {
      // Act
      const icon = mixerViewModel.getMuteIcon('track1');

      // Assert
      expect(icon).toBe('🔇');
    });

    test('getMuteIcon returns correct icon for unmuted track', () => {
      // Act
      const icon = mixerViewModel.getMuteIcon('track2');

      // Assert
      expect(icon).toBe('🔊');
    });

    test('getMuteIcon returns unmuted icon for unknown track', () => {
      // Act
      const icon = mixerViewModel.getMuteIcon('unknown');

      // Assert
      expect(icon).toBe('🔊');
    });
  });

  describe('dispose', () => {
    test('clears all state', () => {
      // Arrange
      mixerViewModel.tracks = [{ id: 'track1', name: 'Track 1' }];
      mixerViewModel.muteStates = { track1: true };
      mixerViewModel.isPlaying = true;
      mixerViewModel.isOperationInProgress = true;

      // Act
      mixerViewModel.dispose();

      // Assert
      expect(mixerViewModel.tracks).toEqual([]);
      expect(mixerViewModel.muteStates).toEqual({});
      expect(mixerViewModel.isPlaying).toBe(false);
      expect(mixerViewModel.isOperationInProgress).toBe(false);
    });
  });
});
