/**
 * ServiceOrderViewModel Tests
 * 
 * Tests for the Service Order ViewModel business logic.
 */
import { vi } from 'vitest';
import ServiceOrderViewModel from '../../viewmodels/ServiceOrderViewModel';

describe('ServiceOrderViewModel', () => {
  let serviceOrderVM;
  let mockServiceOrderService;
  let mockAudioService;
  let mockDisplayService;
  let mockSlideService;

  beforeEach(() => {
    // Create mock services
    mockServiceOrderService = {
      selectFolders: jest.fn(),
      loadSongMetadata: jest.fn(),
      loadLyrics: jest.fn(),
      openLyricsFile: jest.fn(),
      pathExistsInServiceOrder: jest.fn()
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
    serviceOrderVM = new ServiceOrderViewModel(
      mockServiceOrderService,
      mockAudioService,
      mockDisplayService,
      mockSlideService
    );
  });

  describe('initial state', () => {
    test('has empty service order', () => {
      expect(serviceOrderVM.serviceOrder).toEqual([]);
    });

    test('current song index is -1', () => {
      expect(serviceOrderVM.currentSongIndex).toBe(-1);
    });

    test('autoplay is disabled', () => {
      expect(serviceOrderVM.autoplayEnabled).toBe(false);
    });

    test('is first load', () => {
      expect(serviceOrderVM.isFirstLoad).toBe(true);
    });

    test('no current song', () => {
      expect(serviceOrderVM.currentSong).toBeNull();
    });
  });

  describe('computed properties', () => {
    test('currentSong returns correct song', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 1;

      expect(serviceOrderVM.currentSong).toEqual({ id: '2', name: 'Song 2' });
    });

    test('hasNextSong returns true when there is a next song', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 0;

      expect(serviceOrderVM.hasNextSong).toBe(true);
    });

    test('hasNextSong returns false when at end', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 1;

      expect(serviceOrderVM.hasNextSong).toBe(false);
    });

    test('hasPreviousSong returns true when there is a previous song', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 1;

      expect(serviceOrderVM.hasPreviousSong).toBe(true);
    });

    test('canAutoplay returns true when autoplay enabled and has next', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 0;
      serviceOrderVM.autoplayEnabled = true;

      expect(serviceOrderVM.canAutoplay).toBe(true);
    });
  });

  describe('addFolders', () => {
    test('adds folders to service order', async () => {
      mockServiceOrderService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);
      mockServiceOrderService.pathExistsInServiceOrder.mockReturnValue(false);
      mockServiceOrderService.loadSongMetadata
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

      await serviceOrderVM.addFolders();

      expect(serviceOrderVM.serviceOrder).toHaveLength(2);
      expect(serviceOrderVM.serviceOrder[0].name).toBe('Song 1');
      expect(serviceOrderVM.serviceOrder[1].name).toBe('Song 2');
    });

    test('skips folders already in service order', async () => {
      serviceOrderVM.serviceOrder = [{ id: '1', name: 'Song 1', path: '/path/to/song1' }];
      mockServiceOrderService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);
      mockServiceOrderService.pathExistsInServiceOrder.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockServiceOrderService.loadSongMetadata.mockResolvedValueOnce({
        id: '2',
        name: 'Song 2',
        path: '/path/to/song2',
        type: 'song'
      });

      await serviceOrderVM.addFolders();

      expect(serviceOrderVM.serviceOrder).toHaveLength(2);
      expect(serviceOrderVM.serviceOrder[1].name).toBe('Song 2');
    });

    test('handles cancelled folder selection', async () => {
      mockServiceOrderService.selectFolders.mockResolvedValue(null);

      await serviceOrderVM.addFolders();

      expect(serviceOrderVM.serviceOrder).toEqual([]);
      expect(serviceOrderVM.isLoading).toBe(false);
    });

    test('handles errors', async () => {
      mockServiceOrderService.selectFolders.mockRejectedValue(new Error('Selection failed'));

      await serviceOrderVM.addFolders();

      expect(serviceOrderVM.error).toBe('Selection failed');
      expect(serviceOrderVM.isLoading).toBe(false);
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

      const result = await serviceOrderVM.loadItem(item);

      expect(serviceOrderVM.currentLoadedFolder).toBe('/path/to/song1');
      expect(serviceOrderVM.isFirstLoad).toBe(false);
      expect(mockSlideService.loadFromFolder).toHaveBeenCalledWith('/path/to/song1');
      expect(result.slides).toHaveLength(1);
      expect(result.tracks).toHaveLength(1);
    });

    test('sets current song index when provided', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      mockSlideService.loadFromFolder.mockResolvedValue({ slides: [], tracks: [] });

      await serviceOrderVM.loadItem(item, 2);

      expect(serviceOrderVM.currentSongIndex).toBe(2);
    });

    test('skips loading if same folder already loaded', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      serviceOrderVM.currentLoadedFolder = '/path/to/song1';

      const result = await serviceOrderVM.loadItem(item);

      expect(mockSlideService.loadFromFolder).not.toHaveBeenCalled();
      expect(result.slides).toEqual([]);
    });

    test('handles load errors', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/to/song1' };
      mockSlideService.loadFromFolder.mockRejectedValue(new Error('Load failed'));

      const result = await serviceOrderVM.loadItem(item);

      expect(serviceOrderVM.error).toBe('Load failed');
      expect(result.slides).toEqual([]);
    });
  });

  describe('removeItem', () => {
    test('removes item from service order', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];
      serviceOrderVM.currentSongIndex = 2;

      serviceOrderVM.removeItem({ id: '2' });

      expect(serviceOrderVM.serviceOrder).toHaveLength(2);
      expect(serviceOrderVM.serviceOrder[1].id).toBe('3');
      expect(serviceOrderVM.currentSongIndex).toBe(1);
    });

    test('adjusts current song index when removing current song', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' }
      ];
      serviceOrderVM.currentSongIndex = 1;

      serviceOrderVM.removeItem({ id: '2' });

      expect(serviceOrderVM.currentSongIndex).toBe(0);
    });
  });

  describe('reorderItems', () => {
    test('reorders items in service order', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];

      serviceOrderVM.reorderItems(0, 2);

      expect(serviceOrderVM.serviceOrder[0].id).toBe('2');
      expect(serviceOrderVM.serviceOrder[1].id).toBe('3');
      expect(serviceOrderVM.serviceOrder[2].id).toBe('1');
    });

    test('updates current song index when reordering', () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1' },
        { id: '2', name: 'Song 2' },
        { id: '3', name: 'Song 3' }
      ];
      serviceOrderVM.currentSongIndex = 0;

      serviceOrderVM.reorderItems(0, 2);

      expect(serviceOrderVM.currentSongIndex).toBe(2);
    });
  });

  describe('toggleAutoplay', () => {
    test('toggles autoplay enabled state', () => {
      expect(serviceOrderVM.autoplayEnabled).toBe(false);

      serviceOrderVM.toggleAutoplay();
      expect(serviceOrderVM.autoplayEnabled).toBe(true);

      serviceOrderVM.toggleAutoplay();
      expect(serviceOrderVM.autoplayEnabled).toBe(false);
    });
  });

  describe('advanceToNextSong', () => {
    test('advances to next song', async () => {
      serviceOrderVM.serviceOrder = [
        { id: '1', name: 'Song 1', path: '/path/1' },
        { id: '2', name: 'Song 2', path: '/path/2' }
      ];
      serviceOrderVM.currentSongIndex = 0;
      mockSlideService.loadFromFolder.mockResolvedValue({ slides: [], tracks: [] });

      const advanced = await serviceOrderVM.advanceToNextSong();

      expect(advanced).toBe(true);
      expect(serviceOrderVM.currentSongIndex).toBe(1);
    });

    test('returns false when no next song', async () => {
      serviceOrderVM.serviceOrder = [{ id: '1', name: 'Song 1', path: '/path/1' }];
      serviceOrderVM.currentSongIndex = 0;

      const advanced = await serviceOrderVM.advanceToNextSong();

      expect(advanced).toBe(false);
    });
  });

  describe('editLyrics', () => {
    test('opens lyrics file for editing', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/1', type: 'song' };
      mockServiceOrderService.openLyricsFile.mockResolvedValue();

      await serviceOrderVM.editLyrics(item);

      expect(mockServiceOrderService.openLyricsFile).toHaveBeenCalledWith('/path/1');
    });

    test('handles error when opening lyrics file', async () => {
      const item = { id: '1', name: 'Song 1', path: '/path/1', type: 'song' };
      mockServiceOrderService.openLyricsFile.mockRejectedValue(new Error('File not found'));

      await serviceOrderVM.editLyrics(item);

      expect(serviceOrderVM.error).toBe('File not found');
    });
  });

  describe('clearServiceOrder', () => {
    test('clears all service order data', () => {
      serviceOrderVM.serviceOrder = [{ id: '1' }, { id: '2' }];
      serviceOrderVM.currentSongIndex = 1;
      serviceOrderVM.currentLoadedFolder = '/path/1';
      serviceOrderVM.preloadedSongs.add('song1');

      serviceOrderVM.clearServiceOrder();

      expect(serviceOrderVM.serviceOrder).toEqual([]);
      expect(serviceOrderVM.currentSongIndex).toBe(-1);
      expect(serviceOrderVM.currentLoadedFolder).toBeNull();
      expect(serviceOrderVM.preloadedSongs.size).toBe(0);
    });
  });

  describe('isSongPreloaded', () => {
    test('returns true for preloaded song', () => {
      const item = { id: 'song1', path: '/path/1' };
      serviceOrderVM.preloadedSongs.add('song1');

      expect(serviceOrderVM.isSongPreloaded(item)).toBe(true);
    });

    test('returns false for non-preloaded song', () => {
      const item = { id: 'song1', path: '/path/1' };

      expect(serviceOrderVM.isSongPreloaded(item)).toBe(false);
    });
  });
});
