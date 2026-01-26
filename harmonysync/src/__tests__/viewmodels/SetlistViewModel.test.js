/**
 * SetlistViewModel Tests
 * 
 * Tests for the Setlist ViewModel business logic.
 */
import SetlistViewModel from '../../viewmodels/SetlistViewModel';

describe('SetlistViewModel', () => {
  let setlistVM;
  let mockSetlistService;
  let mockAudioService;
  let mockDisplayService;
  let mockSlideService;

  beforeEach(() => {
    // Create mock services
    mockSetlistService = {
      selectFolders: jest.fn(),
      loadSongMetadata: jest.fn(),
      loadLyrics: jest.fn(),
      openLyricsFile: jest.fn(),
      pathExistsInSetlist: jest.fn()
    };

    mockAudioService = {
      stop: jest.fn(),
      cleanup: jest.fn()
    };

    mockDisplayService = {
      clearAll: jest.fn()
    };

    mockSlideService = {
      loadFromFolder: jest.fn()
    };

    // Create ViewModel with mock services
    setlistVM = new SetlistViewModel(
      mockSetlistService,
      mockAudioService,
      mockDisplayService,
      mockSlideService
    );
  });

  describe('initial state', () => {
    test('has empty setlist', () => {
      expect(setlistVM.setlist).toEqual([]);
    });

    test('current song index is -1', () => {
      expect(setlistVM.currentSongIndex).toBe(-1);
    });

    test('autoplay is disabled', () => {
      expect(setlistVM.autoplayEnabled).toBe(false);
    });

    test('is first load', () => {
      expect(setlistVM.isFirstLoad).toBe(true);
    });

    test('no current song', () => {
      expect(setlistVM.currentSong).toBeNull();
    });
  });

  describe('computed properties', () => {
    test('currentSong returns correct song', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 1;

      expect(setlistVM.currentSong).toEqual({ id: '2', name: 'Song 2' });
    });

    test('hasNextSong returns true when there is a next song', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 0;

      expect(setlistVM.hasNextSong).toBe(true);
    });

    test('hasNextSong returns false when at end', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 1;

      expect(setlistVM.hasNextSong).toBe(false);
    });

    test('hasPreviousSong returns true when there is a previous song', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 1;

      expect(setlistVM.hasPreviousSong).toBe(true);
    });

    test('canAutoplay returns true when autoplay enabled and has next', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 0;
      setlistVM.autoplayEnabled = true;

      expect(setlistVM.canAutoplay).toBe(true);
    });
  });

  describe('addFolders', () => {
    test('adds folders to setlist', async () => {
      mockSetlistService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);
      mockSetlistService.pathExistsInSetlist.mockReturnValue(false);
      mockSetlistService.loadSongMetadata
        .mockResolvedValueOnce({
          id: '1',
          name: 'Song 1',
          path: '/path/to/song1',
          type: 'song',
          tracks: []
        })
        .mockResolvedValueOnce({
          id: '2',
          name: 'Song 2',
          path: '/path/to/song2',
          type: 'song',
          tracks: []
        });

      await setlistVM.addFolders();

      expect(setlistVM.setlist).toHaveLength(2);
      expect(setlistVM.setlist[0].name).toBe('Song 1');
      expect(setlistVM.setlist[1].name).toBe('Song 2');
    });

    test('skips folders already in setlist', async () => {
      setlistVM.setlist = [{ id: '1', name: 'Song 1', path: '/path/to/song1' }];
      mockSetlistService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);
      mockSetlistService.pathExistsInSetlist.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockSetlistService.loadSongMetadata.mockResolvedValueOnce({
        id: '2',
        name: 'Song 2',
        path: '/path/to/song2',
        type: 'song'
      });

      await setlistVM.addFolders();

      expect(setlistVM.setlist).toHaveLength(2);
      expect(setlistVM.setlist[1].name).toBe('Song 2');
    });

    test('handles cancelled folder selection', async () => {
      mockSetlistService.selectFolders.mockResolvedValue(null);

      await setlistVM.addFolders();

      expect(setlistVM.setlist).toEqual([]);
      expect(setlistVM.isLoading).toBe(false);
    });

    test('handles errors', async () => {
      mockSetlistService.selectFolders.mockRejectedValue(new Error('Selection failed'));

      await setlistVM.addFolders();

      expect(setlistVM.error).toBe('Selection failed');
      expect(setlistVM.isLoading).toBe(false);
    });
  });

  describe('loadItem', () => {
    test('loads item successfully', async () => {
      const item = {
        id: '1',
        name: 'Song 1',
        path: '/path/to/song1',
        type: 'song'
      };

      mockAudioService.stop.mockResolvedValue();
      mockAudioService.cleanup.mockResolvedValue();
      mockDisplayService.clearAll.mockResolvedValue();
      mockSlideService.loadFromFolder.mockResolvedValue({
        slides: [{ text: 'Slide 1' }],
        tracks: [{ name: 'Track 1' }]
      });

      const result = await setlistVM.loadItem(item);

      expect(setlistVM.currentLoadedFolder).toBe('/path/to/song1');
      expect(setlistVM.isFirstLoad).toBe(false);
      expect(mockSlideService.loadFromFolder).toHaveBeenCalledWith('/path/to/song1');
      expect(result.slides).toHaveLength(1);
      expect(result.tracks).toHaveLength(1);
    });

    test('sets current song index when provided', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      mockSlideService.loadFromFolder.mockResolvedValue({ slides: [], tracks: [] });

      await setlistVM.loadItem(item, 2);

      expect(setlistVM.currentSongIndex).toBe(2);
    });

    test('skips loading if same folder already loaded', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      setlistVM.currentLoadedFolder = '/path/to/song1';

      const result = await setlistVM.loadItem(item);

      expect(mockSlideService.loadFromFolder).not.toHaveBeenCalled();
      expect(result.slides).toEqual([]);
    });

    test('handles load errors', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      mockSlideService.loadFromFolder.mockRejectedValue(new Error('Load failed'));

      const result = await setlistVM.loadItem(item);

      expect(setlistVM.error).toBe('Load failed');
      expect(result.slides).toEqual([]);
    });
  });

  describe('removeItem', () => {
    test('removes item from setlist', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];
      setlistVM.currentSongIndex = 2;

      setlistVM.removeItem({ id: '2' });

      expect(setlistVM.setlist).toHaveLength(2);
      expect(setlistVM.setlist[1].id).toBe('3');
      expect(setlistVM.currentSongIndex).toBe(1);
    });

    test('adjusts current song index when removing current song', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      setlistVM.currentSongIndex = 1;

      setlistVM.removeItem({ id: '2' });

      expect(setlistVM.currentSongIndex).toBe(0);
    });
  });

  describe('reorderItems', () => {
    test('reorders items in setlist', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];

      setlistVM.reorderItems(0, 2);

      expect(setlistVM.setlist[0].id).toBe('2');
      expect(setlistVM.setlist[1].id).toBe('3');
      expect(setlistVM.setlist[2].id).toBe('1');
    });

    test('updates current song index when reordering', () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];
      setlistVM.currentSongIndex = 0;

      setlistVM.reorderItems(0, 2);

      expect(setlistVM.currentSongIndex).toBe(2);
    });
  });

  describe('toggleAutoplay', () => {
    test('toggles autoplay enabled state', () => {
      expect(setlistVM.autoplayEnabled).toBe(false);

      setlistVM.toggleAutoplay();
      expect(setlistVM.autoplayEnabled).toBe(true);

      setlistVM.toggleAutoplay();
      expect(setlistVM.autoplayEnabled).toBe(false);
    });
  });

  describe('advanceToNextSong', () => {
    test('advances to next song', async () => {
      setlistVM.setlist = [
        { id: '1', name: 'Song 1', path: '/path/1' },
        { id: '2', name: 'Song 2', path: '/path/2' }
      ];
      setlistVM.currentSongIndex = 0;
      mockSlideService.loadFromFolder.mockResolvedValue({ slides: [], tracks: [] });

      const advanced = await setlistVM.advanceToNextSong();

      expect(advanced).toBe(true);
      expect(setlistVM.currentSongIndex).toBe(1);
    });

    test('returns false when no next song', async () => {
      setlistVM.setlist = [{ id: '1', name: 'Song 1', path: '/path/1' }];
      setlistVM.currentSongIndex = 0;

      const advanced = await setlistVM.advanceToNextSong();

      expect(advanced).toBe(false);
    });
  });

  describe('editLyrics', () => {
    test('opens lyrics file for editing', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/1', type: 'song' };
      mockSetlistService.openLyricsFile.mockResolvedValue();

      await setlistVM.editLyrics(item);

      expect(mockSetlistService.openLyricsFile).toHaveBeenCalledWith('/path/1');
    });

    test('handles error when opening lyrics file', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/1', type: 'song' };
      mockSetlistService.openLyricsFile.mockRejectedValue(new Error('File not found'));
      global.alert = jest.fn();

      await setlistVM.editLyrics(item);

      expect(setlistVM.error).toBe('File not found');
      expect(global.alert).toHaveBeenCalled();
    });
  });

  describe('clearSetlist', () => {
    test('clears all setlist data', () => {
      setlistVM.setlist = [{ id: '1' }, { id: '2' }];
      setlistVM.currentSongIndex = 1;
      setlistVM.currentLoadedFolder = '/path/1';
      setlistVM.preloadedSongs.add('song1');

      setlistVM.clearSetlist();

      expect(setlistVM.setlist).toEqual([]);
      expect(setlistVM.currentSongIndex).toBe(-1);
      expect(setlistVM.currentLoadedFolder).toBeNull();
      expect(setlistVM.preloadedSongs.size).toBe(0);
    });
  });

  describe('isSongPreloaded', () => {
    test('returns true for preloaded song', () => {
      const item = { id: 'song1', path: '/path/1' };
      setlistVM.preloadedSongs.add('song1');

      expect(setlistVM.isSongPreloaded(item)).toBe(true);
    });

    test('returns false for non-preloaded song', () => {
      const item = { id: 'song1', path: '/path/1' };

      expect(setlistVM.isSongPreloaded(item)).toBe(false);
    });
  });
});
