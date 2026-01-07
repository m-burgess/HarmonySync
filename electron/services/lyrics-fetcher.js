const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const GENIUS_API_TOKEN = process.env.GENIUS_API_TOKEN || '';
const GENIUS_API_BASE = 'https://api.genius.com';

// Search for songs on Genius
async function search(title, artist) {
  try {
    const query = artist ? `${title} ${artist}` : title;
    
    const response = await axios.get(`${GENIUS_API_BASE}/search`, {
      params: { q: query },
      headers: {
        'Authorization': `Bearer ${GENIUS_API_TOKEN}`
      }
    });
    
    return response.data.response.hits.map(hit => ({
      id: hit.result.id,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      url: hit.result.url,
      thumbnail: hit.result.song_art_image_thumbnail_url
    }));
  } catch (error) {
    console.error('Failed to search lyrics:', error);
    throw new Error(`Lyrics search failed: ${error.message}`);
  }
}

// Fetch lyrics for a specific song
async function fetch(songId) {
  try {
    // Get song details from Genius
    const response = await axios.get(`${GENIUS_API_BASE}/songs/${songId}`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_API_TOKEN}`
      }
    });
    
    const song = response.data.response.song;
    
    // Note: Genius API doesn't provide lyrics directly
    // We need to scrape from the URL or use an alternative method
    // For now, return the song info
    return {
      id: song.id,
      title: song.title,
      artist: song.primary_artist.name,
      url: song.url,
      // Lyrics would need to be scraped from the web page
      lyrics: 'Lyrics fetching requires web scraping. Please visit the URL to get lyrics.',
      sections: []
    };
  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    throw new Error(`Lyrics fetch failed: ${error.message}`);
  }
}

// Save lyrics to a song folder
async function saveLyrics(songPath, lyrics) {
  try {
    const lyricsPath = path.join(songPath, 'lyrics.txt');
    await fs.writeFile(lyricsPath, lyrics);
    return true;
  } catch (error) {
    console.error('Failed to save lyrics:', error);
    throw new Error(`Failed to save lyrics: ${error.message}`);
  }
}

module.exports = {
  search,
  fetch,
  saveLyrics
};
