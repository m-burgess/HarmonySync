const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

/**
 * Lyrics Manager Module
 * Handles lyrics fetching from Genius API and file operations
 */

const GENIUS_API_BASE = 'https://api.genius.com';
const GENIUS_API_TOKEN = process.env.GENIUS_API_TOKEN || '';

/**
 * Fetch lyrics from Genius API
 * @param {object} params - Parameters
 * @param {string} params.song_title - Song title
 * @param {string} params.artist - Artist name
 * @returns {Promise<object>} Lyrics data
 */
async function fetchFromGenius(params) {
  const { song_title, artist } = params;
  
  try {
    if (!GENIUS_API_TOKEN) {
      throw new Error('Genius API token not configured');
    }

    // Search for the song
    const searchQuery = `${song_title} ${artist}`;
    const searchResponse = await axios.get(`${GENIUS_API_BASE}/search`, {
      params: { q: searchQuery },
      headers: {
        'Authorization': `Bearer ${GENIUS_API_TOKEN}`
      }
    });

    const hits = searchResponse.data.response.hits;
    if (hits.length === 0) {
      return {
        success: false,
        message: 'No lyrics found'
      };
    }

    // Get the first hit
    const song = hits[0].result;
    
    // Note: Genius API doesn't provide lyrics directly
    // You would need to scrape them or use a different service
    // For now, return the song info
    return {
      success: true,
      song_id: song.id,
      song_title: song.title,
      artist_name: song.primary_artist.name,
      url: song.url,
      message: 'Song found on Genius'
    };
  } catch (error) {
    console.error('Error fetching lyrics from Genius:', error);
    throw error;
  }
}

/**
 * Save lyrics to file
 * @param {object} params - Parameters
 * @param {string} params.song_folder - Folder path
 * @param {string} params.lyrics - Lyrics text
 * @returns {Promise<object>} Save result
 */
async function saveToFile(params) {
  const { song_folder, lyrics } = params;
  
  try {
    const lyricsPath = path.join(song_folder, 'lyrics.txt');
    await fs.writeFile(lyricsPath, lyrics, 'utf-8');
    
    return {
      success: true,
      path: lyricsPath,
      message: 'Lyrics saved successfully'
    };
  } catch (error) {
    console.error('Error saving lyrics:', error);
    throw error;
  }
}

/**
 * Fetch and save lyrics in one operation
 * @param {object} params - Parameters
 * @param {string} params.song_title - Song title
 * @param {string} params.artist - Artist name
 * @param {string} params.song_folder - Folder path
 * @returns {Promise<object>} Result
 */
async function fetchAndSave(params) {
  try {
    const lyricsData = await fetchFromGenius(params);
    
    if (!lyricsData.success) {
      return lyricsData;
    }

    // If we had the actual lyrics, we would save them here
    // For now, just save the song info
    const info = `Song: ${lyricsData.song_title}\nArtist: ${lyricsData.artist_name}\nGenius URL: ${lyricsData.url}\n\n[Lyrics would be scraped from the URL]`;
    
    const saveResult = await saveToFile({
      song_folder: params.song_folder,
      lyrics: info
    });

    return {
      ...lyricsData,
      ...saveResult
    };
  } catch (error) {
    console.error('Error in fetch and save:', error);
    throw error;
  }
}

module.exports = {
  fetchFromGenius,
  saveToFile,
  fetchAndSave
};
