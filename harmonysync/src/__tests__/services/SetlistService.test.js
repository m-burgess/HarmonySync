/**
 * SetlistService Tests
 * 
 * Tests for the Setlist service layer abstraction.
 */
import SetlistService from '../../services/SetlistService';

describe('SetlistService', () => {
  let setlistService;
  let mockIpcService;
  let mockFileService;

  beforeEach(() => {
    mockIpcService = {
      invoke: jest.fn()
    };
    
    mockFileService = {
      selectFolders: jest.fn(),
      exists: jest.fn(),
      readDir: jest.fn(),
      readTextFile: jest.fn(),
      writeTextFile: jest.fn()
    };
    
    setlistService = new SetlistService(mockIpcService, mockFileService);
  });

  describe('selectFolders', () => {
    test('calls fileService.selectFolders', async () => {
      mockFileService.selectFolders.mockResolvedValue(['/path/to/song1', '/path/to/song2']);

      const result = await setlistService.selectFolders();

      expect(mockFileService.selectFolders).toHaveBeenCalled();
      expect(result).toEqual(['/path/to/song1', '/path/to/song2']);
    });

    test('returns null when cancelled', async () => {
      mockFileService.selectFolders.mockResolvedValue(null);

      const result = await setlistService.selectFolders();

      expect(result).toBeNull();
    });
  });

  describe('loadSongMetadata', () => {
    test('loads metadata for song folder with ogg and lyrics', async () => {
      const folderPath = '/path/to/song1';
      mockFileService.exists.mockResolvedValue(true); // ogg folder exists
      mockFileService.readDir
        .mockResolvedValueOnce([
          { name: 'track1.ogg', children: undefined },
          { name: 'track2.ogg', children: undefined }
        ])
        .mockResolvedValueOnce([
          { name: 'lyrics.txt', children: undefined }
        ]);
      mockFileService.readTextFile.mockResolvedValue('Song lyrics here');

      const result = await setlistService.loadSongMetadata(folderPath);

      expect(result.name).toBe('song1');
      expect(result.path).toBe(folderPath);
      expect(result.type).toBe('song');
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0].track_name).toBe('track1.ogg');
      expect(result.lyrics).toBe('Song lyrics here');
    });

    test('loads metadata for folder without ogg subfolder', async () => {
      const folderPath = '/path/to/folder1';
      mockFileService.exists.mockResolvedValue(false); // ogg folder doesn't exist

      const result = await setlistService.loadSongMetadata(folderPath);

      expect(result.name).toBe('folder1');
      expect(result.type).toBe('folder');
      expect(result.tracks).toBeUndefined();
      expect(result.lyrics).toBeUndefined();
    });

    test('handles Windows path separators', async () => {
      const folderPath = 'C:\\Users\\Songs\\song1';
      mockFileService.exists.mockResolvedValue(false);

      const result = await setlistService.loadSongMetadata(folderPath);

      expect(result.name).toBe('song1');
    });
  });

  describe('loadTracks', () => {
    test('loads and sorts ogg tracks', async () => {
      mockFileService.readDir.mockResolvedValue([
        { name: 'vocal.ogg', children: undefined },
        { name: 'bass.ogg', children: undefined },
        { name: 'drums.ogg', children: undefined },
        { name: 'subfolder', children: [] }, // Should be filtered out
        { name: 'info.txt', children: undefined } // Should be filtered out
      ]);

      const tracks = await setlistService.loadTracks('/path/to/song1/ogg');

      expect(tracks).toHaveLength(3);
      expect(tracks[0].track_name).toBe('bass.ogg'); // Sorted alphabetically
      expect(tracks[1].track_name).toBe('drums.ogg');
      expect(tracks[2].track_name).toBe('vocal.ogg');
      expect(tracks[0].file_path).toBe('/path/to/song1/ogg/bass.ogg');
    });
  });

  describe('loadLyrics', () => {
    test('loads lyrics from lyrics.txt', async () => {
      mockFileService.readDir.mockResolvedValue([
        { name: 'lyrics.txt', children: undefined }
      ]);
      mockFileService.readTextFile.mockResolvedValue('Amazing Grace, how sweet the sound');

      const lyrics = await setlistService.loadLyrics('/path/to/song1');

      expect(lyrics).toBe('Amazing Grace, how sweet the sound');
    });

    test('handles Uint8Array response', async () => {
      mockFileService.readDir.mockResolvedValue([
        { name: 'lyrics.txt', children: undefined }
      ]);
      const uint8Array = new TextEncoder().encode('Test lyrics');
      mockFileService.readTextFile.mockResolvedValue(uint8Array);

      const lyrics = await setlistService.loadLyrics('/path/to/song1');

      expect(lyrics).toBe('Test lyrics');
    });

    test('returns empty string when no lyrics file', async () => {
      mockFileService.readDir.mockResolvedValue([
        { name: 'info.txt', children: undefined }
      ]);

      const lyrics = await setlistService.loadLyrics('/path/to/song1');

      expect(lyrics).toBe('');
    });

    test('returns empty string on error', async () => {
      mockFileService.readDir.mockRejectedValue(new Error('Read failed'));

      const lyrics = await setlistService.loadLyrics('/path/to/song1');

      expect(lyrics).toBe('');
    });
  });

  describe('saveLyrics', () => {
    test('writes lyrics to lyrics.txt', async () => {
      mockFileService.writeTextFile.mockResolvedValue();

      await setlistService.saveLyrics('/path/to/song1', 'New lyrics content');

      expect(mockFileService.writeTextFile).toHaveBeenCalledWith(
        '/path/to/song1/lyrics.txt',
        'New lyrics content'
      );
    });
  });

  describe('openLyricsFile', () => {
    test('opens lyrics file when it exists', async () => {
      mockFileService.exists.mockResolvedValue(true);
      mockIpcService.invoke.mockResolvedValue();

      await setlistService.openLyricsFile('/path/to/song1');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('open_lyrics_file', {
        path: '/path/to/song1/lyrics.txt'
      });
    });

    test('throws error when lyrics file does not exist', async () => {
      mockFileService.exists.mockResolvedValue(false);

      await expect(setlistService.openLyricsFile('/path/to/song1'))
        .rejects.toThrow('No lyrics.txt file found');
    });
  });

  describe('fetchLyrics', () => {
    test('fetches lyrics from online service', async () => {
      mockIpcService.invoke.mockResolvedValue('Fetched lyrics from API');

      const lyrics = await setlistService.fetchLyrics('Amazing Grace', 'John Newton');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('lyrics:fetch', {
        songName: 'Amazing Grace',
        artist: 'John Newton'
      });
      expect(lyrics).toBe('Fetched lyrics from API');
    });
  });

  describe('pathExistsInSetlist', () => {
    test('returns true when path exists in setlist', () => {
      const setlist = [
        { id: '1', path: '/path/to/song1' },
        { id: '2', path: '/path/to/song2' }
      ];

      const exists = setlistService.pathExistsInSetlist(setlist, '/path/to/song1');

      expect(exists).toBe(true);
    });

    test('returns false when path does not exist in setlist', () => {
      const setlist = [
        { id: '1', path: '/path/to/song1' },
        { id: '2', path: '/path/to/song2' }
      ];

      const exists = setlistService.pathExistsInSetlist(setlist, '/path/to/song3');

      expect(exists).toBe(false);
    });
  });

  describe('parseLyricsToSlides', () => {
    test('calls IPC to parse lyrics', async () => {
      mockIpcService.invoke.mockResolvedValue([
        { text: 'Verse 1', type: 'verse' },
        { text: 'Chorus', type: 'chorus' }
      ]);

      const slides = await setlistService.parseLyricsToSlides('Lyrics text');

      expect(mockIpcService.invoke).toHaveBeenCalledWith('lyrics:parse', 'Lyrics text');
      expect(slides).toHaveLength(2);
    });
  });
});
