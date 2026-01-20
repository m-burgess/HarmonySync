const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

/**
 * Video Service
 * Handles all video-related operations including metadata extraction,
 * transcoding, thumbnail generation, and display coordination.
 */

// Get cache directory for video operations
function getCacheDir() {
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache');
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

// Helper function to parse FFmpeg timemark to seconds
function parseTimemark(timemark) {
  if (typeof timemark === 'number') return timemark;
  if (typeof timemark !== 'string') return 0;
  
  // Format: HH:MM:SS.MS or MM:SS.MS
  const parts = timemark.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    // HH:MM:SS.MS
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.MS
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else {
    seconds = parseFloat(timemark);
  }
  
  return seconds;
}

/**
 * Get comprehensive video metadata
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<Object>} Video metadata including duration, dimensions, codecs
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        duration: Math.round(metadata.format.duration || 0),
        width: videoStream?.width,
        height: videoStream?.height,
        audio_codec: audioStream?.codec_name,
        video_codec: videoStream?.codec_name,
        format: metadata.format.format_name,
        bit_rate: metadata.format.bit_rate,
        size: metadata.format.size
      });
    });
  });
}

/**
 * Transcode video for compatibility
 * Converts videos to H.264/AAC format for broad compatibility
 * @param {string} inputPath - Path to input video
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<string>} Path to transcoded video
 */
async function transcodeVideo(inputPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const cacheDir = getCacheDir();
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(cacheDir, `${fileName}_transcoded.mp4`);
    
    // Check if transcoded file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`Transcoded video already exists: ${outputPath}`);
      resolve(outputPath);
      return;
    }
    
    // Get duration first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      
      const totalDuration = metadata.format.duration || 0;
      
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .videoFilters('format=yuv420p')
        .outputOptions([
          '-preset medium',
          '-crf 23',
          '-movflags +faststart'
        ])
        .on('progress', (progress) => {
          if (progressCallback && totalDuration > 0) {
            const currentTime = parseTimemark(progress.timemark);
            const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
            progressCallback({
              file_name: fileName,
              progress: percent,
              message: `Transcoding ${fileName}...`
            });
          }
        })
        .on('end', () => {
          console.log(`Transcoding complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`Transcoding error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  });
}

/**
 * Generate video thumbnail
 * @param {string} videoPath - Path to the video file
 * @param {number} timestamp - Timestamp in seconds (default: 3)
 * @param {string} size - Thumbnail size (default: '320x240')
 * @returns {Promise<string>} Path to generated thumbnail
 */
async function generateThumbnail(videoPath, timestamp = 3, size = '320x240') {
  return new Promise((resolve, reject) => {
    const cacheDir = getCacheDir();
    const thumbnailName = `${uuidv4()}.png`;
    const thumbnailPath = path.join(cacheDir, thumbnailName);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: thumbnailName,
        folder: cacheDir,
        size: size
      })
      .on('end', () => {
        console.log(`Thumbnail generated: ${thumbnailPath}`);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.error(`Thumbnail generation error: ${err.message}`);
        reject(err);
      });
  });
}

/**
 * Extract video frames at specific intervals
 * @param {string} videoPath - Path to the video file
 * @param {number} intervalSeconds - Interval between frames in seconds
 * @returns {Promise<Array<string>>} Array of frame image paths
 */
async function extractFrames(videoPath, intervalSeconds = 5) {
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await getVideoMetadata(videoPath);
      const duration = metadata.duration;
      const frameCount = Math.floor(duration / intervalSeconds);
      const cacheDir = getCacheDir();
      const framesDir = path.join(cacheDir, 'frames', uuidv4());
      await fs.ensureDir(framesDir);
      
      const timestamps = [];
      for (let i = 0; i < frameCount; i++) {
        timestamps.push(i * intervalSeconds);
      }
      
      ffmpeg(videoPath)
        .screenshots({
          timestamps: timestamps,
          filename: 'frame_%i.png',
          folder: framesDir,
          size: '640x480'
        })
        .on('end', async () => {
          const files = await fs.readdir(framesDir);
          const framePaths = files.map(f => path.join(framesDir, f));
          console.log(`Extracted ${framePaths.length} frames from video`);
          resolve(framePaths);
        })
        .on('error', (err) => {
          console.error(`Frame extraction error: ${err.message}`);
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
async function getVideoDuration(videoPath) {
  const metadata = await getVideoMetadata(videoPath);
  return metadata.duration;
}

/**
 * Check if video needs transcoding for compatibility
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<boolean>} True if transcoding is needed
 */
async function needsTranscoding(videoPath) {
  try {
    const metadata = await getVideoMetadata(videoPath);
    
    // Check if video codec is H.264 and audio is AAC
    const videoCodecOk = metadata.video_codec === 'h264';
    const audioCodecOk = !metadata.audio_codec || metadata.audio_codec === 'aac';
    
    return !(videoCodecOk && audioCodecOk);
  } catch (err) {
    console.error('Error checking transcode need:', err);
    return true; // Assume transcoding needed on error
  }
}

/**
 * Optimize video for web streaming
 * @param {string} inputPath - Path to input video
 * @returns {Promise<string>} Path to optimized video
 */
async function optimizeForStreaming(inputPath) {
  const cacheDir = getCacheDir();
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(cacheDir, `${fileName}_optimized.mp4`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 22',
        '-movflags +faststart', // Enable progressive streaming
        '-pix_fmt yuv420p'
      ])
      .on('end', () => {
        console.log(`Video optimized for streaming: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`Optimization error: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = {
  getVideoMetadata,
  transcodeVideo,
  generateThumbnail,
  extractFrames,
  getVideoDuration,
  needsTranscoding,
  optimizeForStreaming
};
