const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const axios = require('axios');

/**
 * YouTube Service
 * Handles YouTube-specific operations including video transcoding for upload,
 * link management, and YouTube-compatible format conversion.
 */

// Get cache directory for YouTube operations
function getCacheDir() {
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache', 'youtube');
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

// Helper function to parse FFmpeg timemark to seconds
function parseTimemark(timemark) {
  if (typeof timemark === 'number') return timemark;
  if (typeof timemark !== 'string') return 0;
  
  const parts = timemark.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else {
    seconds = parseFloat(timemark);
  }
  
  return seconds;
}

/**
 * Transcode video for YouTube upload
 * Uses YouTube's recommended encoding settings
 * @param {string} inputPath - Path to input video
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<string>} Path to YouTube-ready video
 */
async function transcodeForYouTube(inputPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const cacheDir = getCacheDir();
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(cacheDir, `${fileName}_youtube.mp4`);
    
    // Check if already transcoded
    if (fs.existsSync(outputPath)) {
      console.log(`YouTube-ready video already exists: ${outputPath}`);
      resolve(outputPath);
      return;
    }
    
    // Get duration for progress tracking
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      
      const totalDuration = metadata.format.duration || 0;
      
      // YouTube recommended settings
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .audioFrequency(48000) // YouTube prefers 48kHz
        .videoFilters('format=yuv420p')
        .outputOptions([
          '-preset medium',
          '-crf 23',
          '-profile:v high',
          '-level:v 4.0',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-maxrate 10M',
          '-bufsize 20M'
        ])
        .on('progress', (progress) => {
          if (progressCallback && totalDuration > 0) {
            const currentTime = parseTimemark(progress.timemark);
            const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
            progressCallback({
              file_name: fileName,
              progress: percent,
              message: `Transcoding for YouTube: ${fileName}...`
            });
          }
        })
        .on('end', () => {
          console.log(`YouTube transcoding complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`YouTube transcoding error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  });
}

/**
 * Validate video meets YouTube requirements
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<Object>} Validation result with isValid and issues array
 */
async function validateForYouTube(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      
      const issues = [];
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      // Check file size (YouTube limit: 256GB, but practical limit much lower)
      const fileSizeMB = metadata.format.size / (1024 * 1024);
      if (fileSizeMB > 128000) { // 128GB practical limit
        issues.push('File size exceeds 128GB');
      }
      
      // Check duration (YouTube limit: 12 hours for verified accounts)
      const durationHours = metadata.format.duration / 3600;
      if (durationHours > 12) {
        issues.push('Video duration exceeds 12 hours');
      }
      
      // Check resolution
      if (videoStream) {
        const width = videoStream.width;
        const height = videoStream.height;
        
        // YouTube supports up to 8K (7680x4320)
        if (width > 7680 || height > 4320) {
          issues.push('Resolution exceeds 8K (7680x4320)');
        }
      }
      
      // Check video codec
      if (videoStream && !['h264', 'vp9', 'av1'].includes(videoStream.codec_name)) {
        issues.push(`Video codec ${videoStream.codec_name} may not be optimal for YouTube`);
      }
      
      // Check audio codec
      if (audioStream && !['aac', 'mp3', 'vorbis', 'opus'].includes(audioStream.codec_name)) {
        issues.push(`Audio codec ${audioStream.codec_name} may not be optimal for YouTube`);
      }
      
      resolve({
        isValid: issues.length === 0,
        issues: issues,
        metadata: {
          duration: metadata.format.duration,
          size: fileSizeMB,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'N/A'
        }
      });
    });
  });
}

/**
 * Add YouTube link to database
 * @param {Object} db - Database connection
 * @param {number} presentationId - Presentation ID
 * @param {string} url - YouTube URL
 * @returns {Promise<number>} Inserted link ID
 */
async function addYouTubeLink(db, presentationId, url) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO youtube_links (presentation_id, url) VALUES (?, ?)');
    
    try {
      stmt.run(presentationId, url, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    } finally {
      // Ensure finalization always happens
      try {
        stmt.finalize();
      } catch (finalizeErr) {
        console.error('Error finalizing statement:', finalizeErr);
      }
    }
  });
}

/**
 * Get YouTube links for a presentation
 * @param {Object} db - Database connection
 * @param {number} presentationId - Presentation ID
 * @returns {Promise<Array>} Array of YouTube links
 */
async function getYouTubeLinks(db, presentationId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, presentation_id, url FROM youtube_links WHERE presentation_id = ?',
      [presentationId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Delete YouTube link
 * @param {Object} db - Database connection
 * @param {number} linkId - Link ID
 * @returns {Promise<void>}
 */
async function deleteYouTubeLink(db, linkId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM youtube_links WHERE id = ?', [linkId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} YouTube video ID or null
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get YouTube video thumbnail URL
 * @param {string} videoIdOrUrl - YouTube video ID or URL
 * @param {string} quality - Thumbnail quality: 'default', 'medium', 'high', 'standard', 'maxres'
 * @returns {string} Thumbnail URL
 */
function getYouTubeThumbnailUrl(videoIdOrUrl, quality = 'high') {
  const videoId = extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
  
  const qualityMap = {
    'default': 'default.jpg',
    'medium': 'mqdefault.jpg',
    'high': 'hqdefault.jpg',
    'standard': 'sddefault.jpg',
    'maxres': 'maxresdefault.jpg'
  };
  
  const filename = qualityMap[quality] || qualityMap['high'];
  return `https://img.youtube.com/vi/${videoId}/${filename}`;
}

/**
 * Validate YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
function isValidYouTubeUrl(url) {
  return extractYouTubeId(url) !== null;
}

/**
 * Generate YouTube embed URL
 * @param {string} videoIdOrUrl - YouTube video ID or URL
 * @param {Object} options - Embed options (autoplay, loop, controls, etc.)
 * @returns {string} YouTube embed URL
 */
function generateEmbedUrl(videoIdOrUrl, options = {}) {
  const videoId = extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
  const params = new URLSearchParams();
  
  if (options.autoplay) params.append('autoplay', '1');
  if (options.loop) {
    params.append('loop', '1');
    params.append('playlist', videoId); // Required for loop
  }
  if (options.controls === false) params.append('controls', '0');
  if (options.mute) params.append('mute', '1');
  if (options.start) params.append('start', options.start.toString());
  if (options.end) params.append('end', options.end.toString());
  
  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
}

module.exports = {
  transcodeForYouTube,
  validateForYouTube,
  addYouTubeLink,
  getYouTubeLinks,
  deleteYouTubeLink,
  extractYouTubeId,
  getYouTubeThumbnailUrl,
  isValidYouTubeUrl,
  generateEmbedUrl
};
