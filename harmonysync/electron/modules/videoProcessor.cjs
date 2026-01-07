const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { parseFile } = require('music-metadata');

/**
 * Video Processor Module
 * Handles video transcoding and metadata extraction using FFmpeg
 */

/**
 * Get video metadata
 * @param {string} videoPath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: metadata.format.duration ? Math.floor(metadata.format.duration) : 0,
        thumbnail_path: null,
        audio_codec: audioStream ? audioStream.codec_name : null,
        width: videoStream ? videoStream.width : 0,
        height: videoStream ? videoStream.height : 0,
        framerate: videoStream ? eval(videoStream.r_frame_rate) : 0
      });
    });
  });
}

/**
 * Transcode video to optimized format
 * @param {string} videoPath - Source video path
 * @param {string} songFolder - Destination folder
 * @param {function} progressCallback - Progress callback function
 * @returns {Promise<object>} Result with transcoded video path
 */
async function transcodeVideo(videoPath, songFolder, progressCallback) {
  const fileName = path.basename(videoPath, path.extname(videoPath));
  const outputPath = path.join(songFolder, `${fileName}.mp4`);

  // Check if already transcoded
  if (await fs.pathExists(outputPath)) {
    return { success: true, path: outputPath, message: 'Video already transcoded' };
  }

  return new Promise((resolve, reject) => {
    let totalDuration = 0;

    ffmpeg(videoPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p'
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('codecData', (data) => {
        totalDuration = parseInt(data.duration.replace(/:/g, ''));
      })
      .on('progress', (progress) => {
        if (progressCallback && totalDuration > 0) {
          const percent = (progress.timemark.replace(/:/g, '') / totalDuration) * 100;
          progressCallback({
            file_name: fileName,
            progress: Math.min(Math.floor(percent), 100),
            message: `Transcoding: ${Math.floor(percent)}%`
          });
        }
      })
      .on('end', () => {
        resolve({ success: true, path: outputPath, message: 'Video transcoded successfully' });
      })
      .on('error', (err) => {
        console.error('Transcoding error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Display video slide (for triggering video playback events)
 * @param {string} videoPath - Path to video
 * @returns {Promise<object>} Success status
 */
async function displayVideoSlide(videoPath) {
  // This is handled on the frontend, just return success
  return { success: true, path: videoPath };
}

module.exports = {
  getVideoMetadata,
  transcodeVideo,
  displayVideoSlide
};
