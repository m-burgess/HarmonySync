/**
 * FFmpeg Service
 * Handles FFmpeg-based operations including audio conversion, transposition,
 * video metadata extraction, transcoding, and thumbnail generation.
 */

import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { BaseElectronService, IFFmpegService, ServiceConfig } from '../types/services';

/**
 * Audio sync check result
 */
interface AudioSyncResult {
  synced: boolean;
  message: string;
}

/**
 * FFmpeg Service Implementation
 * Provides comprehensive FFmpeg wrapper functionality with proper error handling
 */
export class FFmpegService extends BaseElectronService implements IFFmpegService {
  protected readonly serviceName = 'FFmpegService';
  private readonly rhythmSectionNames = ['guide', 'click', 'drums', 'percussion', 'shakers'];
  private readonly audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the FFmpeg service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'FFmpeg service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'FFmpeg service disposed');
  }

  /**
   * Convert audio file to Ogg format
   * @param inputPath - Path to input audio file
   * @param outputDir - Directory for output file
   * @param onProgress - Optional progress callback
   * @returns Path to converted file
   */
  public async convertToOgg(
    inputPath: string,
    outputDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      await fs.ensureDir(outputDir);

      const fileName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${fileName}.ogg`);

      // Get duration first
      const metadata = await this.probeFile(inputPath);
      const totalDuration = metadata.format.duration || 0;

      return new Promise<string>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libvorbis')
          .audioBitrate('128k')
          .audioQuality(4)
          .on('progress', (progress: any) => {
            if (onProgress && totalDuration > 0) {
              const currentTime = this.parseTimemark(progress.timemark);
              const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
              onProgress(percent);
            }
          })
          .on('end', () => {
            this.log('info', `Conversion complete: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `Conversion error: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      this.handleError('convertToOgg', error);
    }
  }

  /**
   * Transpose audio files by semitones
   * @param songPath - Path to song directory containing audio files
   * @param semitones - Number of semitones to transpose (positive for up, negative for down)
   * @returns Result containing output directory and transposed tracks
   */
  public async transposeAudio(songPath: string, semitones: number): Promise<string> {
    try {
      const transposedFolderName =
        semitones > 0
          ? `transposed_up_${semitones}`
          : `transposed_down_${Math.abs(semitones)}`;

      const outputDir = path.join(songPath, transposedFolderName);
      await fs.ensureDir(outputDir);

      // Get all audio files from the song directory
      const files = await fs.readdir(songPath);
      const audioFiles = files.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return this.audioExtensions.includes(ext);
      });

      const transposedTracks: Array<{ name: string; filePath: string }> = [];

      for (const audioFile of audioFiles) {
        const inputPath = path.join(songPath, audioFile);
        const baseName = path.basename(audioFile, path.extname(audioFile));
        const outputPath = path.join(outputDir, audioFile);

        // Check if this is a rhythm section track (don't transpose)
        const isRhythmSection = this.rhythmSectionNames.some((name) =>
          baseName.toLowerCase().includes(name)
        );

        if (isRhythmSection) {
          // Just copy the file without transposition
          await fs.copy(inputPath, outputPath);
          this.log('info', `Copied rhythm section track: ${baseName}`);
        } else {
          // Transpose the audio
          await this.transposeAudioFile(inputPath, outputPath, semitones, baseName);
        }

        transposedTracks.push({
          name: baseName,
          filePath: outputPath,
        });
      }

      this.log('info', `Transposed ${transposedTracks.length} tracks by ${semitones} semitones`);
      return outputDir;
    } catch (error) {
      this.handleError('transposeAudio', error);
    }
  }

  /**
   * Get video metadata
   * @param path - Path to video file
   * @returns Video metadata
   */
  public async getVideoMetadata(videoPath: string): Promise<any> {
    try {
      const metadata = await this.probeFile(videoPath);

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

      return {
        duration: Math.round(metadata.format.duration || 0),
        width: videoStream?.width,
        height: videoStream?.height,
        audio_codec: audioStream?.codec_name,
        video_codec: videoStream?.codec_name,
      };
    } catch (error) {
      this.handleError('getVideoMetadata', error);
    }
  }

  /**
   * Transcode video for compatibility
   * @param inputPath - Path to input video
   * @param outputPath - Optional output path (defaults to cache directory)
   * @returns Path to transcoded video
   */
  public async transcodeVideo(inputPath: string, outputPath?: string): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const finalOutputPath = outputPath || path.join(cacheDir, `${fileName}_transcoded.mp4`);

      // Check if transcoded file already exists
      if (await fs.pathExists(finalOutputPath)) {
        this.log('info', `Transcoded video already exists: ${finalOutputPath}`);
        return finalOutputPath;
      }

      // Get duration first
      const metadata = await this.probeFile(inputPath);
      const totalDuration = metadata.format.duration || 0;

      return new Promise<string>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .audioBitrate('128k')
          .videoFilters('format=yuv420p')
          .outputOptions(['-preset medium', '-crf 23', '-movflags +faststart'])
          .on('progress', (progress: any) => {
            if (totalDuration > 0) {
              const currentTime = this.parseTimemark(progress.timemark);
              const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
              this.log('debug', `Transcoding progress: ${percent}%`);
            }
          })
          .on('end', () => {
            this.log('info', `Transcoding complete: ${finalOutputPath}`);
            resolve(finalOutputPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `Transcoding error: ${err.message}`);
            reject(err);
          })
          .save(finalOutputPath);
      });
    } catch (error) {
      this.handleError('transcodeVideo', error);
    }
  }

  /**
   * Generate video thumbnail
   * @param videoPath - Path to video file
   * @param outputPath - Optional output path (defaults to cache directory)
   * @returns Path to generated thumbnail
   */
  public async generateThumbnail(videoPath: string, outputPath?: string): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const thumbnailPath = outputPath || path.join(cacheDir, `${uuidv4()}.png`);

      return new Promise<string>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['3'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '320x240',
          })
          .on('end', () => {
            this.log('info', `Thumbnail generated: ${thumbnailPath}`);
            resolve(thumbnailPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `Thumbnail generation error: ${err.message}`);
            reject(err);
          });
      });
    } catch (error) {
      this.handleError('generateThumbnail', error);
    }
  }

  /**
   * Ensure audio files are synced
   * @param audioFiles - Array of audio file paths
   * @returns Sync check result
   */
  public async ensureAudioSync(audioFiles: string[]): Promise<AudioSyncResult> {
    try {
      const metadata: any[] = [];

      for (const file of audioFiles) {
        const meta = await this.probeFile(file);
        metadata.push(meta);
      }

      // Check if all files have the same duration (within 0.1 seconds)
      const durations = metadata.map((m) => m.format.duration);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      if (maxDuration - minDuration > 0.1) {
        this.log('warn', 'Audio files have different durations, sync may be affected');
        return { synced: false, message: 'Duration mismatch detected' };
      }

      // Check sample rates
      const sampleRates = metadata.map((m) => {
        const audioStream = m.streams.find((s: any) => s.codec_type === 'audio');
        return audioStream?.sample_rate;
      });

      const uniqueSampleRates = [...new Set(sampleRates)];
      if (uniqueSampleRates.length > 1) {
        this.log('warn', 'Audio files have different sample rates');
        return { synced: false, message: 'Sample rate mismatch detected' };
      }

      return { synced: true, message: 'All audio files are synced' };
    } catch (error) {
      this.log('error', 'Error checking audio sync:', error);
      return { synced: false, message: 'Error checking sync' };
    }
  }

  /**
   * Get cache directory
   * @returns Cache directory path
   */
  private getCacheDir(): string {
    const appData = app.getPath('userData');
    const cacheDir = path.join(appData, 'harmonysync', 'cache');
    fs.ensureDirSync(cacheDir);
    return cacheDir;
  }

  /**
   * Parse FFmpeg timemark to seconds
   * @param timemark - Timemark string or number
   * @returns Time in seconds
   */
  private parseTimemark(timemark: string | number): number {
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
   * Probe file for metadata
   * @param filePath - Path to file
   * @returns Metadata
   */
  private async probeFile(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe file: ${err.message}`));
          return;
        }
        resolve(metadata);
      });
    });
  }

  /**
   * Transpose a single audio file
   * @param inputPath - Input file path
   * @param outputPath - Output file path
   * @param semitones - Number of semitones to transpose
   * @param baseName - Base name for logging
   */
  private async transposeAudioFile(
    inputPath: string,
    outputPath: string,
    semitones: number,
    baseName: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const asetrate = 44100 * Math.pow(2, semitones / 12);

      ffmpeg(inputPath)
        .audioFilters([`asetrate=${asetrate}`, 'aresample=44100'])
        .audioCodec('copy')
        .on('end', () => {
          this.log('info', `Transposed: ${baseName} by ${semitones} semitones`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.log('error', `Error transposing ${baseName}:`, err);
          reject(err);
        })
        .save(outputPath);
    });
  }
}

// Export singleton instance
let ffmpegServiceInstance: FFmpegService | null = null;

/**
 * Get or create the FFmpeg service singleton
 */
export function getFFmpegService(config?: ServiceConfig): FFmpegService {
  if (!ffmpegServiceInstance) {
    ffmpegServiceInstance = new FFmpegService(config);
  }
  return ffmpegServiceInstance;
}

// Export for backward compatibility
export default FFmpegService;
