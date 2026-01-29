/**
 * ServiceOrderService Tests
 * 
 * Tests for the Service Order service layer abstraction.
 */
import { vi } from 'vitest';
import ServiceOrderService from '../../services/ServiceOrderService';

describe('ServiceOrderService', () => {
  let serviceOrderService;
  let mockIpcService;
  let mockFileService;

  beforeEach(() => {
    mockIpcService = {
      invoke: vi.fn()
    };
    
    mockFileService = {
      selectFolders: vi.fn(),
      getSongFolders: vi.fn()
    };
    
    serviceOrderService = new ServiceOrderService(mockIpcService, mockFileService);
  });

  describe('selectFolders', () => {
    test('calls fileService.selectFolders', async () => {
      mockFileService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);

      const result = await serviceOrderService.selectFolders();

      expect(mockFileService.selectFolders).toHaveBeenCalled();
      expect(result).toEqual(['/path/to/song1', '/path/to/song2']);
    });

    test('returns null when cancelled', async () => {
      mockFileService.selectFolders.mockResolvedValue(null);

      const result = await serviceOrderService.selectFolders();

      expect(result).toBeNull();
    });
  });

  describe('loadServiceOrder', () => {
    test('loads service order from base path', async () => {
      const mockFolders = [
        { id: '1', name: 'Song 1', path: '/path/to/song1' },
        { id: '2', name: 'Song 2', path: '/path/to/song2' }
      ];
      mockFileService.getSongFolders.mockResolvedValue(mockFolders);

      const result = await serviceOrderService.loadServiceOrder('/base/path');

      expect(mockFileService.getSongFolders).toHaveBeenCalledWith('/base/path');
      expect(result).toEqual(mockFolders);
    });
  });

  describe('loadSongMetadata', () => {
    test('loads metadata for song folder', async () => {
      const mockMetadata = {
        id: '1',
        name: 'Song 1',
        path: '/path/to/song1',
        type: 'song'
      };
      mockIpcService.invoke.mockResolvedValue(mockMetadata);

      const result = await serviceOrderService.loadSongMetadata('/path/to/song1');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('service-order:loadSongMetadata', '/path/to/song1');
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('loadLyrics', () => {
    test('loads lyrics from song path', async () => {
      mockIpcService.invoke.mockResolvedValue('Amazing Grace, how sweet the sound');

      const lyrics = await serviceOrderService.loadLyrics('/path/to/song1');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('service-order:loadLyrics', '/path/to/song1');
      expect(lyrics).toBe('Amazing Grace, how sweet the sound');
    });

    test('returns null on error', async () => {
      mockIpcService.invoke.mockRejectedValue(new Error('Read failed'));

      const lyrics = await serviceOrderService.loadLyrics('/path/to/song1');

      expect(lyrics).toBeNull();
    });
  });

  describe('openLyricsFile', () => {
    test('opens lyrics file', async () => {
      mockIpcService.invoke.mockResolvedValue();

      await serviceOrderService.openLyricsFile('/path/to/song1');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('service-order:openLyricsFile', '/path/to/song1');
    });
  });

  describe('pathExistsInServiceOrder', () => {
    test('returns true when path exists in service order', () => {
      const serviceOrder = [
        { id: '1', path: '/path/to/song1' },
        { id: '2', path: '/path/to/song2' }
      ];

      const exists = serviceOrderService.pathExistsInServiceOrder(serviceOrder, '/path/to/song1');

      expect(exists).toBe(true);
    });

    test('returns false when path does not exist in service order', () => {
      const serviceOrder = [
        { id: '1', path: '/path/to/song1' },
        { id: '2', path: '/path/to/song2' }
      ];

      const exists = serviceOrderService.pathExistsInServiceOrder(serviceOrder, '/path/to/song3');

      expect(exists).toBe(false);
    });
  });

  describe('getSongDetails', () => {
    test('gets song details from IPC', async () => {
      const mockSong = {
        id: '1',
        name: 'Amazing Grace',
        path: '/path/to/song1',
        artist: 'John Newton'
      };
      mockIpcService.invoke.mockResolvedValue(mockSong);

      const result = await serviceOrderService.getSongDetails('/path/to/song1');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('service-order:getSongDetails', '/path/to/song1');
      expect(result).toEqual(mockSong);
    });
  });

  describe('searchSongs', () => {
    test('searches songs by query', async () => {
      const mockResults = [
        { id: '1', name: 'Amazing Grace' },
        { id: '2', name: 'How Great Thou Art' }
      ];
      mockIpcService.invoke.mockResolvedValue(mockResults);

      const results = await serviceOrderService.searchSongs('grace');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('service-order:searchSongs', 'grace');
      expect(results).toEqual(mockResults);
    });

    test('returns empty array on error', async () => {
      mockIpcService.invoke.mockRejectedValue(new Error('Search failed'));

      const results = await serviceOrderService.searchSongs('grace');

      expect(results).toEqual([]);
    });
  });
});
