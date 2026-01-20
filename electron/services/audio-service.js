const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

/**
 * Audio Service
 * Handles all audio-related operations including format conversion,
 * transposition, and synchronization checks.
 */

// Get cache directory for audio operations
function getCacheDir() {
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache', 'audio');
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
 * Convert audio file to Ogg format
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Output directory path
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<string>} Path to converted file
 */
async function convertToOgg(inputPath, outputDir, progressCallback) {
  return new Promise((resolve, reject) => {
    fs.ensureDirSync(outputDir);
    
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${fileName}.ogg`);
    
    // Get duration first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe file: ${err.message}`));
        return;
      }
      
      const totalDuration = metadata.format.duration || 0;
      
      ffmpeg(inputPath)
        .audioCodec('libvorbis')
        .audioBitrate('128k')
        .audioQuality(4)
        .on('progress', (progress) => {
          if (progressCallback && totalDuration > 0) {
            const currentTime = parseTimemark(progress.timemark);
            const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
            progressCallback({
              file_name: fileName,
              progress: percent,
              message: `Converting ${fileName}...`
            });
          }
        })
        .on('end', () => {
          console.log(`Conversion complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`Conversion error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  });
}

/**
 * Transpose audio files in a directory
 * @param {string} songPath - Path to song directory
 * @param {number} semitones - Number of semitones to transpose (positive or negative)
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object>} Object with outputDir and tracks array
 */
async function transposeAudio(songPath, semitones, progressCallback) {
  const transposedFolderName = semitones > 0 
    ? `transposed_up_${semitones}` 
    : `transposed_down_${Math.abs(semitones)}`;
  
  const outputDir = path.join(songPath, transposedFolderName);
  await fs.ensureDir(outputDir);
  
  // Get all audio files from the song directory
  const files = await fs.readdir(songPath);
  const audioFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext);
  });
  
  const transposedTracks = [];
  const rhythmSectionNames = ['guide', 'click', 'drums', 'percussion', 'shakers'];
  
  for (const audioFile of audioFiles) {
    const inputPath = path.join(songPath, audioFile);
    const baseName = path.basename(audioFile, path.extname(audioFile));
    const outputPath = path.join(outputDir, audioFile);
    
    // Check if this is a rhythm section track (don't transpose)
    const isRhythmSection = rhythmSectionNames.some(name => 
      baseName.toLowerCase().includes(name)
    );
    
    if (isRhythmSection) {
      // Just copy the file without transposition
      await fs.copy(inputPath, outputPath);
      console.log(`Copied rhythm section track: ${baseName}`);
    } else {
      // Transpose the audio
      await new Promise((resolve, reject) => {
        const asetrate = 44100 * Math.pow(2, semitones / 12);
        
        ffmpeg(inputPath)
          .audioFilters([
            `asetrate=${asetrate}`,
            'aresample=44100'
          ])
          .audioCodec('copy')
          .on('end', () => {
            console.log(`Transposed: ${baseName} by ${semitones} semitones`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error transposing ${baseName}:`, err);
            reject(err);
          })
          .save(outputPath);
      });
    }
    
    transposedTracks.push({
      name: baseName,
      filePath: outputPath
    });
  }
  
  if (progressCallback) {
    progressCallback(transposedTracks);
  }
  
  return {
    outputDir,
    tracks: transposedTracks
  };
}

/**
 * Ensure audio files are synchronized
 * @param {Array<string>} audioFiles - Array of audio file paths
 * @returns {Promise<Object>} Sync status object
 */
async function ensureAudioSync(audioFiles) {
  const metadata = [];
  
  for (const file of audioFiles) {
    const meta = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(file, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    metadata.push(meta);
  }
  
  // Check if all files have the same duration (within 0.1 seconds)
  const durations = metadata.map(m => m.format.duration);
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  
  if (maxDuration - minDuration > 0.1) {
    console.warn('Audio files have different durations, sync may be affected');
    return { synced: false, message: 'Duration mismatch detected' };
  }
  
  // Check sample rates
  const sampleRates = metadata.map(m => {
    const audioStream = m.streams.find(s => s.codec_type === 'audio');
    return audioStream?.sample_rate;
  });
  
  const uniqueSampleRates = [...new Set(sampleRates)];
  if (uniqueSampleRates.length > 1) {
    console.warn('Audio files have different sample rates');
    return { synced: false, message: 'Sample rate mismatch detected' };
  }
  
  return { synced: true, message: 'All audio files are synced' };
}

/**
 * Get audio file metadata
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<Object>} Audio metadata
 */
async function getAudioMetadata(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get audio metadata: ${err.message}`));
        return;
      }
      
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        duration: Math.round(metadata.format.duration || 0),
        codec: audioStream?.codec_name,
        sample_rate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        bit_rate: metadata.format.bit_rate,
        size: metadata.format.size
      });
    });
  });
}

/**
 * Normalize audio levels
 * @param {string} inputPath - Path to input audio file
 * @param {number} targetLevel - Target level in dB (default: -23)
 * @returns {Promise<string>} Path to normalized file
 */
async function normalizeAudio(inputPath, targetLevel = -23) {
  const cacheDir = getCacheDir();
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(cacheDir, `${fileName}_normalized.mp3`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(`loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('end', () => {
        console.log(`Audio normalized: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`Normalization error: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = {
  convertToOgg,
  transposeAudio,
  ensureAudioSync,
  getAudioMetadata,
  normalizeAudio
};
