/**
 * Lyrics Fetcher Service
 * Fetches lyrics from various sources (Genius API)
 */

import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseElectronService, ILyricsFetcher, ServiceConfig } from '@harmonysync/core';

/**
 * Genius API response structures
 */
interface GeniusArtist {
  name: string;
}

interface GeniusSongResult {
  id: number;
  title: string;
  primary_artist: GeniusArtist;
  url: string;
  song_art_image_thumbnail_url: string;
}

interface GeniusSearchHit {
  result: GeniusSongResult;
}

interface GeniusSearchResponse {
  response: {
    hits: GeniusSearchHit[];
  };
}

interface GeniusSongResponse {
  response: {
    song: {
      id: number;
      title: string;
      primary_artist: GeniusArtist;
      url: string;
    };
  };
}

/**
 * Lyrics search result interface
 */
interface LyricsSearchResult {
  id: number;
  title: string;
  artist: string;
  url: string;
  thumbnail: string;
}

/**
 * Lyrics fetch result interface
 */
interface LyricsFetchResult {
  id: number;
  title: string;
  artist: string;
  url: string;
  lyrics: string | null;
  message: string;
  sections: string[];
}

/**
 * Lyrics Fetcher Service Implementation
 * Handles lyrics search and fetching from Genius API
 */
export class LyricsFetcherService extends BaseElectronService implements ILyricsFetcher {
  protected readonly serviceName = 'LyricsFetcherService';

  private readonly apiToken: string;
  private readonly apiBase: string = 'https://api.genius.com';

  constructor(apiToken?: string, config?: ServiceConfig) {
    super(config);
    this.apiToken = apiToken || process.env.GENIUS_API_TOKEN || '';
  }

  /**
   * Initialize the lyrics fetcher service
   */
  protected override async onInitialize(): Promise<void> {
    if (!this.apiToken) {
      this.log('warn', 'Genius API token not configured. Set GENIUS_API_TOKEN environment variable.');
    }
    this.log('info', 'Lyrics fetcher service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Lyrics fetcher service disposed');
  }

  /**
   * Search for songs on Genius
   * @param query - Search query (usually title and artist)
   * @returns Array of search results
   */
  public async search(query: string): Promise<LyricsSearchResult[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Genius API token not configured');
      }

      const response: AxiosResponse<GeniusSearchResponse> = await axios.get(`${this.apiBase}/search`, {
        params: { q: query },
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      const results = response.data.response.hits.map(hit => ({
        id: hit.result.id,
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        url: hit.result.url,
        thumbnail: hit.result.song_art_image_thumbnail_url
      }));

      this.log('debug', `Found ${results.length} results for query: ${query}`);
      return results;
    } catch (error) {
      this.handleError('search', error);
    }
  }

  /**
   * Fetch lyrics for a specific song
   * Note: Genius API doesn't provide lyrics directly due to licensing.
   * This returns song metadata and a URL to view lyrics.
   * @param title - Song title
   * @param artist - Artist name
   * @returns Lyrics fetch result
   */
  public async fetch(title: string, artist: string): Promise<LyricsFetchResult> {
    try {
      if (!this.apiToken) {
        throw new Error('Genius API token not configured');
      }

      // First, search for the song
      const query = artist ? `${title} ${artist}` : title;
      const searchResults = await this.search(query);

      if (searchResults.length === 0) {
        throw new Error(`No results found for: ${query}`);
      }

      // Get the first result's details
      const songId = searchResults[0].id;
      const response: AxiosResponse<GeniusSongResponse> = await axios.get(`${this.apiBase}/songs/${songId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      const song = response.data.response.song;

      // Note: Genius API doesn't provide lyrics directly due to licensing
      // Lyrics must be obtained through their web interface or third-party scraping
      this.log('info', `Fetched song info for: ${song.title} by ${song.primary_artist.name}`);

      return {
        id: song.id,
        title: song.title,
        artist: song.primary_artist.name,
        url: song.url,
        lyrics: null,
        message: 'Visit the URL to view and copy lyrics from Genius.com',
        sections: []
      };
    } catch (error) {
      this.handleError('fetch', error);
    }
  }

  /**
   * Fetch lyrics by song ID
   * @param songId - Genius song ID
   * @returns Lyrics fetch result
   */
  public async fetchById(songId: number): Promise<LyricsFetchResult> {
    try {
      if (!this.apiToken) {
        throw new Error('Genius API token not configured');
      }

      const response: AxiosResponse<GeniusSongResponse> = await axios.get(`${this.apiBase}/songs/${songId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      const song = response.data.response.song;

      this.log('info', `Fetched song info for ID ${songId}: ${song.title}`);

      return {
        id: song.id,
        title: song.title,
        artist: song.primary_artist.name,
        url: song.url,
        lyrics: null,
        message: 'Visit the URL to view and copy lyrics from Genius.com',
        sections: []
      };
    } catch (error) {
      this.handleError('fetchById', error);
    }
  }

  /**
   * Save lyrics to a song folder
   * @param songPath - Path to song folder
   * @param lyrics - Lyrics text to save
   * @returns True if successful
   */
  public async saveLyrics(songPath: string, lyrics: string): Promise<boolean> {
    try {
      const lyricsPath = path.join(songPath, 'lyrics.txt');
      await fs.writeFile(lyricsPath, lyrics, 'utf-8');
      this.log('info', `Saved lyrics to: ${lyricsPath}`);
      return true;
    } catch (error) {
      this.handleError('saveLyrics', error);
    }
  }

  /**
   * Load lyrics from a song folder
   * @param songPath - Path to song folder
   * @returns Lyrics text or null if not found
   */
  public async loadLyrics(songPath: string): Promise<string | null> {
    try {
      const lyricsPath = path.join(songPath, 'lyrics.txt');

      if (!await fs.pathExists(lyricsPath)) {
        this.log('debug', `No lyrics file found at: ${lyricsPath}`);
        return null;
      }

      const lyrics = await fs.readFile(lyricsPath, 'utf-8');
      this.log('debug', `Loaded lyrics from: ${lyricsPath}`);
      return lyrics;
    } catch (error) {
      this.log('error', 'Error loading lyrics:', error);
      return null;
    }
  }

  /**
   * Check if lyrics exist for a song folder
   * @param songPath - Path to song folder
   * @returns True if lyrics file exists
   */
  public async hasLyrics(songPath: string): Promise<boolean> {
    try {
      const lyricsPath = path.join(songPath, 'lyrics.txt');
      return await fs.pathExists(lyricsPath);
    } catch (error) {
      this.log('error', 'Error checking for lyrics:', error);
      return false;
    }
  }

  /**
   * Delete lyrics from a song folder
   * @param songPath - Path to song folder
   * @returns True if successful
   */
  public async deleteLyrics(songPath: string): Promise<boolean> {
    try {
      const lyricsPath = path.join(songPath, 'lyrics.txt');

      if (!await fs.pathExists(lyricsPath)) {
        this.log('debug', `No lyrics to delete at: ${lyricsPath}`);
        return false;
      }

      await fs.remove(lyricsPath);
      this.log('info', `Deleted lyrics from: ${lyricsPath}`);
      return true;
    } catch (error) {
      this.handleError('deleteLyrics', error);
    }
  }

  /**
   * Scrape lyrics from a URL (e.g. Genius.com)
   * @param url - URL to scrape
   * @returns Cleaned lyrics text
   */
  public async scrape(url: string): Promise<string> {
    try {
      this.log('info', `Scraping lyrics from: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;

      // Genius.com specific scraping
      if (url.includes('genius.com')) {
        // Find all lyrics containers
        const lyricsContainers = html.match(/<div data-lyrics-container="true"[\s\S]*?<\/div>/g);

        if (!lyricsContainers) {
          throw new Error('Could not find lyrics content on page');
        }

        let fullLyrics = lyricsContainers.join('\n');

        // 1. Clean up <br/> tags to newlines
        fullLyrics = fullLyrics.replace(/<br\s*\/?>/gi, '\n');

        // 2. Remove all other HTML tags
        fullLyrics = fullLyrics.replace(/<[^>]*>?/gm, '');

        // 3. Decode HTML entities (basic ones)
        fullLyrics = fullLyrics
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&rsquo;/g, "'")
          .replace(/&hellip;/g, '...');

        // 4. Clean up whitespace
        const lines = fullLyrics.split('\n');
        const cleanedLines = lines
          .map((line: string) => line.trim())
          .filter((line: string) => {
            // Filter out junk
            const upper = line.toUpperCase();
            if (upper.includes('EMBED')) return false;
            if (upper === 'LYRICS') return false;
            if (upper.includes('YOU MIGHT ALSO LIKE')) return false;
            return line.length > 0;
          });

        return cleanedLines.join('\n');
      }

      // Generic fallback: strip all tags and try to find blocks
      let text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>?/gm, '\n');

      return text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join('\n');

    } catch (error) {
      this.handleError('scrape', error);
      throw error;
    }
  }
}

// Export for backward compatibility
export function createLyricsFetcherService(apiToken?: string, config?: ServiceConfig): LyricsFetcherService {
  return new LyricsFetcherService(apiToken, config);
}

// Singleton instance for backward compatibility
const defaultInstance = new LyricsFetcherService();

// Export function-based API for backward compatibility
export async function search(title: string, artist?: string): Promise<LyricsSearchResult[]> {
  const query = artist ? `${title} ${artist}` : title;
  return defaultInstance.search(query);
}

export async function fetch(songId: number): Promise<LyricsFetchResult>;
export async function fetch(title: string, artist: string): Promise<LyricsFetchResult>;
export async function fetch(titleOrId: string | number, artist?: string): Promise<LyricsFetchResult> {
  if (typeof titleOrId === 'number') {
    return defaultInstance.fetchById(titleOrId);
  }
  return defaultInstance.fetch(titleOrId, artist || '');
}

export async function saveLyrics(songPath: string, lyrics: string): Promise<boolean> {
  return defaultInstance.saveLyrics(songPath, lyrics);
}
