"use strict";
/**
 * Lyrics Fetcher Service
 * Fetches lyrics from various sources (Genius API)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricsFetcherService = void 0;
exports.createLyricsFetcherService = createLyricsFetcherService;
exports.search = search;
exports.fetch = fetch;
exports.saveLyrics = saveLyrics;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const services_1 = require("../types/services");
/**
 * Lyrics Fetcher Service Implementation
 * Handles lyrics search and fetching from Genius API
 */
class LyricsFetcherService extends services_1.BaseElectronService {
    constructor(apiToken, config) {
        super(config);
        this.serviceName = 'LyricsFetcherService';
        this.apiBase = 'https://api.genius.com';
        this.apiToken = apiToken || process.env.GENIUS_API_TOKEN || '';
    }
    /**
     * Initialize the lyrics fetcher service
     */
    async onInitialize() {
        if (!this.apiToken) {
            this.log('warn', 'Genius API token not configured. Set GENIUS_API_TOKEN environment variable.');
        }
        this.log('info', 'Lyrics fetcher service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'Lyrics fetcher service disposed');
    }
    /**
     * Search for songs on Genius
     * @param query - Search query (usually title and artist)
     * @returns Array of search results
     */
    async search(query) {
        try {
            if (!this.apiToken) {
                throw new Error('Genius API token not configured');
            }
            const response = await axios_1.default.get(`${this.apiBase}/search`, {
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
        }
        catch (error) {
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
    async fetch(title, artist) {
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
            const response = await axios_1.default.get(`${this.apiBase}/songs/${songId}`, {
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
        }
        catch (error) {
            this.handleError('fetch', error);
        }
    }
    /**
     * Fetch lyrics by song ID
     * @param songId - Genius song ID
     * @returns Lyrics fetch result
     */
    async fetchById(songId) {
        try {
            if (!this.apiToken) {
                throw new Error('Genius API token not configured');
            }
            const response = await axios_1.default.get(`${this.apiBase}/songs/${songId}`, {
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
        }
        catch (error) {
            this.handleError('fetchById', error);
        }
    }
    /**
     * Save lyrics to a song folder
     * @param songPath - Path to song folder
     * @param lyrics - Lyrics text to save
     * @returns True if successful
     */
    async saveLyrics(songPath, lyrics) {
        try {
            const lyricsPath = path.join(songPath, 'lyrics.txt');
            await fs.writeFile(lyricsPath, lyrics, 'utf-8');
            this.log('info', `Saved lyrics to: ${lyricsPath}`);
            return true;
        }
        catch (error) {
            this.handleError('saveLyrics', error);
        }
    }
    /**
     * Load lyrics from a song folder
     * @param songPath - Path to song folder
     * @returns Lyrics text or null if not found
     */
    async loadLyrics(songPath) {
        try {
            const lyricsPath = path.join(songPath, 'lyrics.txt');
            if (!await fs.pathExists(lyricsPath)) {
                this.log('debug', `No lyrics file found at: ${lyricsPath}`);
                return null;
            }
            const lyrics = await fs.readFile(lyricsPath, 'utf-8');
            this.log('debug', `Loaded lyrics from: ${lyricsPath}`);
            return lyrics;
        }
        catch (error) {
            this.log('error', 'Error loading lyrics:', error);
            return null;
        }
    }
    /**
     * Check if lyrics exist for a song folder
     * @param songPath - Path to song folder
     * @returns True if lyrics file exists
     */
    async hasLyrics(songPath) {
        try {
            const lyricsPath = path.join(songPath, 'lyrics.txt');
            return await fs.pathExists(lyricsPath);
        }
        catch (error) {
            this.log('error', 'Error checking for lyrics:', error);
            return false;
        }
    }
    /**
     * Delete lyrics from a song folder
     * @param songPath - Path to song folder
     * @returns True if successful
     */
    async deleteLyrics(songPath) {
        try {
            const lyricsPath = path.join(songPath, 'lyrics.txt');
            if (!await fs.pathExists(lyricsPath)) {
                this.log('debug', `No lyrics to delete at: ${lyricsPath}`);
                return false;
            }
            await fs.remove(lyricsPath);
            this.log('info', `Deleted lyrics from: ${lyricsPath}`);
            return true;
        }
        catch (error) {
            this.handleError('deleteLyrics', error);
        }
    }
}
exports.LyricsFetcherService = LyricsFetcherService;
// Export for backward compatibility
function createLyricsFetcherService(apiToken, config) {
    return new LyricsFetcherService(apiToken, config);
}
// Singleton instance for backward compatibility
const defaultInstance = new LyricsFetcherService();
// Export function-based API for backward compatibility
async function search(title, artist) {
    const query = artist ? `${title} ${artist}` : title;
    return defaultInstance.search(query);
}
async function fetch(titleOrId, artist) {
    if (typeof titleOrId === 'number') {
        return defaultInstance.fetchById(titleOrId);
    }
    return defaultInstance.fetch(titleOrId, artist || '');
}
async function saveLyrics(songPath, lyrics) {
    return defaultInstance.saveLyrics(songPath, lyrics);
}
