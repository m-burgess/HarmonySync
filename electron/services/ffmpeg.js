const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

// Get cache directory
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

// Convert audio file to Ogg format
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

// Transpose audio files
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

// Get video metadata
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
        video_codec: videoStream?.codec_name
      });
    });
  });
}

// Transcode video for compatibility
async function transcodeVideo(inputPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const cacheDir = getCacheDir();
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(cacheDir, `${fileName}_transcoded.mp4`);
    
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

// Generate video thumbnail
async function generateThumbnail(videoPath) {
  return new Promise((resolve, reject) => {
    const cacheDir = getCacheDir();
    const thumbnailPath = path.join(cacheDir, `${uuidv4()}.png`);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['3'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '320x240'
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

// Ensure audio files are synced before playback
async function ensureAudioSync(audioFiles) {
  // This function will ensure all audio files are ready and properly aligned
  // by checking their metadata and ensuring they have the same sample rate
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

module.exports = {
  convertToOgg,
  transposeAudio,
  getVideoMetadata,
  transcodeVideo,
  generateThumbnail,
  ensureAudioSync
};
