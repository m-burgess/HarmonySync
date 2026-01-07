const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

/**
 * Audio Transposer Module
 * Handles audio transposition using FFmpeg
 * Transposes audio files up or down by semitones while preserving rhythm tracks
 */

const RHYTHM_KEYWORDS = ['guide', 'click', 'drum', 'percussion', 'shaker'];

/**
 * Check if a file is a rhythm track that should not be transposed
 * @param {string} fileName - Name of the file
 * @returns {boolean} True if rhythm track
 */
function isRhythmTrack(fileName) {
  const lowerName = fileName.toLowerCase();
  return RHYTHM_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Transpose audio files by semitones
 * @param {object} params - Parameters
 * @param {string} params.song_folder - Source folder containing audio files
 * @param {number} params.semitones - Number of semitones to transpose (can be negative)
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} Result with transposed files info
 */
async function transposeAudioFiles(params, progressCallback) {
  const { song_folder, semitones } = params;
  
  try {
    // Create output folder
    const outputFolder = path.join(song_folder, `transposed_${semitones > 0 ? '+' : ''}${semitones}`);
    await fs.ensureDir(outputFolder);

    // Get all audio files
    const files = await fs.readdir(song_folder);
    const audioFiles = files.filter(f => 
      /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f)
    );

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in folder');
    }

    let completed = 0;
    const results = [];

    for (const file of audioFiles) {
      const inputPath = path.join(song_folder, file);
      const outputPath = path.join(outputFolder, file);

      // Check if this is a rhythm track
      if (isRhythmTrack(file)) {
        // Copy without transposing
        await fs.copy(inputPath, outputPath);
        results.push({
          file: file,
          transposed: false,
          reason: 'rhythm_track'
        });
      } else {
        // Transpose the audio
        await transposeFile(inputPath, outputPath, semitones);
        results.push({
          file: file,
          transposed: true,
          semitones: semitones
        });
      }

      completed++;
      const progress = Math.floor((completed / audioFiles.length) * 100);
      
      if (progressCallback) {
        progressCallback({
          file_name: file,
          progress: progress,
          message: `Transposed ${completed}/${audioFiles.length} files`
        });
      }
    }

    return {
      success: true,
      output_folder: outputFolder,
      files_processed: audioFiles.length,
      results: results
    };
  } catch (error) {
    console.error('Error transposing audio files:', error);
    throw error;
  }
}

/**
 * Transpose a single audio file
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {number} semitones - Number of semitones to transpose
 * @returns {Promise<void>}
 */
function transposeFile(inputPath, outputPath, semitones) {
  return new Promise((resolve, reject) => {
    // Calculate pitch shift in cents (100 cents = 1 semitone)
    const cents = semitones * 100;
    
    ffmpeg(inputPath)
      .audioFilters([
        {
          filter: 'asetrate',
          options: `44100*2^(${cents}/1200)`
        },
        {
          filter: 'aresample',
          options: '44100'
        }
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Convert audio file to OGG format
 * @param {object} params - Parameters
 * @param {string} params.input_path - Input file path
 * @param {string} params.output_path - Output file path
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} Result with output path
 */
async function convertToOgg(params, progressCallback) {
  const { input_path, output_path } = params;
  
  return new Promise((resolve, reject) => {
    let totalDuration = 0;
    const fileName = path.basename(input_path);

    ffmpeg(input_path)
      .output(output_path)
      .audioCodec('libvorbis')
      .audioQuality(5)
      .on('codecData', (data) => {
        totalDuration = parseInt(data.duration.replace(/:/g, ''));
      })
      .on('progress', (progress) => {
        if (progressCallback && totalDuration > 0) {
          const percent = (progress.timemark.replace(/:/g, '') / totalDuration) * 100;
          progressCallback({
            file_name: fileName,
            progress: Math.min(Math.floor(percent), 100),
            message: `Converting to OGG: ${Math.floor(percent)}%`
          });
        }
      })
      .on('end', () => {
        resolve({ 
          success: true, 
          output_path: output_path,
          message: 'Converted to OGG successfully' 
        });
      })
      .on('error', (err) => {
        console.error('Conversion error:', err);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  transposeAudioFiles,
  convertToOgg
};
