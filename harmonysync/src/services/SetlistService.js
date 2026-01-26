/**
 * Setlist Service - Business logic for setlist management
 * 
 * This service abstracts all setlist-related functionality including:
 * - Adding folders to setlist
 * - Loading song metadata and tracks
 * - Managing lyrics
 * - Handling preloading
 * - Service import from zip files
 */
class SetlistService {
  constructor(ipcService, fileService) {
    this.ipc = ipcService;
    this.fileService = fileService;
  }

  /**
   * Open dialog to select folders for setlist
   * @returns {Promise<Array<string>|null>} Selected folder paths or null
   */
  async selectFolders() {
    return await this.fileService.selectFolders();
  }

  /**
   * Load song metadata from a folder
   * @param {string} folderPath - Path to song folder
   * @returns {Promise<Object>} Song metadata with tracks and lyrics
   */
  async loadSongMetadata(folderPath) {
    const folderName = folderPath.split('/').pop() || folderPath.split('\\').pop();
    
    // Check for ogg subfolder
    const oggDir = `${folderPath}/ogg`;
    const oggExists = await this.fileService.exists(oggDir);
    
    // Generate unique ID using timestamp and random string
    // Note: For production, consider using crypto.randomUUID() or a proper UUID library
    // Current implementation is sufficient for non-critical, low-collision scenarios
    const metadata = {
      id: `setlist-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      path: folderPath,
      name: folderName,
      type: 'folder',
      loaded: false
    };

    if (oggExists) {
      // Load tracks from ogg folder
      const tracks = await this.loadTracks(oggDir);
      
      // Load lyrics if available
      const lyrics = await this.loadLyrics(folderPath);
      
      metadata.type = 'song';
      metadata.tracks = tracks;
      metadata.lyrics = lyrics;
    }

    return metadata;
  }

  /**
   * Load audio tracks from ogg folder
   * @param {string} oggPath - Path to ogg folder
   * @returns {Promise<Array>} Array of track objects
   */
  async loadTracks(oggPath) {
    const entries = await this.fileService.readDir(oggPath, { recursive: false });
    
    const tracks = entries
      .filter(e => e.children === undefined && e.name.endsWith('.ogg'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({
        file_path: `${oggPath}/${e.name}`,
        track_name: e.name
      }));

    return tracks;
  }

  /**
   * Load lyrics from song folder
   * @param {string} folderPath - Path to song folder
   * @returns {Promise<string>} Lyrics text or empty string
   */
  async loadLyrics(folderPath) {
    try {
      const entries = await this.fileService.readDir(folderPath, { recursive: false });
      const lyricsFile = entries.find(entry => 
        entry.name === 'lyrics.txt' && entry.children === undefined
      );
      
      if (lyricsFile) {
        const lyricsPath = `${folderPath}/${lyricsFile.name}`;
        let lyricsContent = await this.fileService.readTextFile(lyricsPath);
        
        // Handle Uint8Array response
        if (lyricsContent instanceof Uint8Array) {
          lyricsContent = new TextDecoder().decode(lyricsContent);
        }
        
        return typeof lyricsContent === 'string' ? lyricsContent : '';
      }
    } catch (error) {
      console.warn('Failed to load lyrics:', error);
    }
    
    return '';
  }

  /**
   * Save lyrics to song folder
   * @param {string} folderPath - Path to song folder
   * @param {string} lyrics - Lyrics content
   * @returns {Promise<void>}
   */
  async saveLyrics(folderPath, lyrics) {
    const lyricsPath = `${folderPath}/lyrics.txt`;
    await this.fileService.writeTextFile(lyricsPath, lyrics);
  }

  /**
   * Open lyrics file in default text editor
   * @param {string} folderPath - Path to song folder
   * @returns {Promise<void>}
   */
  async openLyricsFile(folderPath) {
    const lyricsPath = `${folderPath}/lyrics.txt`;
    
    // Check if file exists
    const exists = await this.fileService.exists(lyricsPath);
    if (!exists) {
      throw new Error('No lyrics.txt file found in this song folder.');
    }
    
    await this.ipc.invoke('open_lyrics_file', { path: lyricsPath });
  }

  /**
   * Fetch lyrics from online service (if available)
   * @param {string} songName - Song name to search
   * @param {string} artist - Artist name (optional)
   * @returns {Promise<string>} Fetched lyrics
   */
  async fetchLyrics(songName, artist = '') {
    return await this.ipc.invoke('lyrics:fetch', { songName, artist });
  }

  /**
   * Check if song folder already exists in setlist
   * @param {Array} setlist - Current setlist
   * @param {string} path - Folder path to check
   * @returns {boolean} True if path already exists
   */
  pathExistsInSetlist(setlist, path) {
    return setlist.some(item => item.path === path);
  }

  /**
   * Parse lyrics into slides format
   * @param {string} lyrics - Lyrics text
   * @returns {Array} Array of slide objects
   */
  parseLyricsToSlides(lyrics) {
    // This could delegate to a lyrics parsing utility
    // For now, return a simple implementation
    return this.ipc.invoke('lyrics:parse', lyrics);
  }
}

export default SetlistService;
