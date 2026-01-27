/**
 * Audio Service (In-Process - Lightweight Operations)
 * 
 * NOTE: This service handles LIGHTWEIGHT audio operations within the Electron
 * main process. For CPU-intensive operations like multitrack playback and
 * real-time mixing, use the separate Audio Service (harmonysync-audio-service).
 * 
 * This service is responsible for:
 * - Quick metadata extraction (duration, codec, sample rate)
 * - Audio format validation and detection
 * - Simple format conversions (e.g., to Ogg)
 * - Audio transposition (creates new files without blocking the main thread)
 * - Audio synchronization checks
 * 
 * CPU-intensive operations handled by separate service:
 * - Multitrack audio playback
 * - Real-time mixing and synchronization
 * - Audio crossfading
 * - Memory-intensive buffer management
 */

import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { BaseElectronService } from '../types/services';
import { ConversionProgress } from '../types/models';

// ==================== Type Definitions ====================

interface FFprobeMetadata {
  format: {
    duration?: number;
    bit_rate?: string;
    size?: string;
  };
  streams: Array<{
    codec_type?: string;
    codec_name?: string;
    sample_rate?: string;
    channels?: number;
  }>;
}

interface FFmpegProgress {
  timemark: string | number;
  frames?: number;
  currentFps?: number;
  targetSize?: number;
}

interface TransposedTrack {
  name: string;
  filePath: string;
}

interface TransposeResult {
  outputDir: string;
  tracks: TransposedTrack[];
}

interface SyncStatus {
  synced: boolean;
  message: string;
}

interface AudioServiceMetadata {
  duration: number;
  codec?: string;
  sample_rate?: string;
  channels?: number;
  bit_rate?: string;
  size?: string;
}

type ProgressCallback = (progress: ConversionProgress) => void;

// ==================== Audio Service Class ====================

/**
 * AudioService - Manages audio operations using FFmpeg
 * Extends BaseElectronService for consistent service behavior
 */
export class AudioService extends BaseElectronService {
  protected readonly serviceName = 'AudioService';
  private cacheDir: string = '';

  /**
   * Initialize the audio service
   */
  protected override async onInitialize(): Promise<void> {
    this.cacheDir = this.getCacheDir();
    this.log('info', `Cache directory: ${this.cacheDir}`);
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    // No specific cleanup needed for audio service
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get cache directory for audio operations
   */
  private getCacheDir(): string {
    const appData = app.getPath('userData');
    const cacheDir = path.join(appData, 'harmonysync', 'cache', 'audio');
    fs.ensureDirSync(cacheDir);
    return cacheDir;
  }

  /**
   * Parse FFmpeg timemark to seconds
   */
  private parseTimemark(timemark: string | number): number {
    if (typeof timemark === 'number') {
      return timemark;
    }
    
    if (typeof timemark !== 'string') {
      return 0;
    }
    
    const parts = timemark.split(':');
    let seconds = 0;
    
    if (parts.length === 3) {
      seconds = parseInt(parts[0], 10) * 3600 + 
                parseInt(parts[1], 10) * 60 + 
                parseFloat(parts[2]);
    } else if (parts.length === 2) {
      seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
    } else {
      seconds = parseFloat(timemark);
    }
    
    return seconds;
  }

  /**
   * Probe audio file metadata using FFprobe
   */
  private async probeFile(filePath: string): Promise<FFprobeMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe file: ${err.message}`));
        } else {
          resolve(metadata as FFprobeMetadata);
        }
      });
    });
  }

  // ==================== Public API Methods ====================

  /**
   * Convert audio file to Ogg format
   * @param inputPath - Path to input audio file
   * @param outputDir - Output directory path
   * @param progressCallback - Optional progress callback
   * @returns Path to converted file
   */
  public async convertToOgg(
    inputPath: string,
    outputDir: string,
    progressCallback?: ProgressCallback
  ): Promise<string> {
    this.ensureInitialized();

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
          .on('progress', (progress: FFmpegProgress) => {
            if (progressCallback && totalDuration > 0) {
              const currentTime = this.parseTimemark(progress.timemark);
              const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
              progressCallback({
                percent,
                currentTime,
                totalTime: totalDuration,
                message: `Converting ${fileName}...`
              });
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
      return this.handleError('convertToOgg', error);
    }
  }

  /**
   * Transpose audio files in a directory
   * @param songPath - Path to song directory
   * @param semitones - Number of semitones to transpose (positive or negative)
   * @param progressCallback - Optional progress callback
   * @returns Object with outputDir and tracks array
   */
  public async transposeAudio(
    songPath: string,
    semitones: number,
    progressCallback?: (tracks: TransposedTrack[]) => void
  ): Promise<TransposeResult> {
    this.ensureInitialized();

    try {
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
      
      const transposedTracks: TransposedTrack[] = [];
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
          this.log('info', `Copied rhythm section track: ${baseName}`);
        } else {
          // Transpose the audio
          await new Promise<void>((resolve, reject) => {
            const asetrate = 44100 * Math.pow(2, semitones / 12);
            
            ffmpeg(inputPath)
              .audioFilters([
                `asetrate=${asetrate}`,
                'aresample=44100'
              ])
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
    } catch (error) {
      return this.handleError('transposeAudio', error);
    }
  }

  /**
   * Ensure audio files are synchronized
   * @param audioFiles - Array of audio file paths
   * @returns Sync status object
   */
  public async ensureAudioSync(audioFiles: string[]): Promise<SyncStatus> {
    this.ensureInitialized();

    try {
      const metadata: FFprobeMetadata[] = [];
      
      for (const file of audioFiles) {
        const meta = await this.probeFile(file);
        metadata.push(meta);
      }
      
      // Check if all files have the same duration (within 0.1 seconds)
      const durations = metadata.map(m => m.format.duration || 0);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      if (maxDuration - minDuration > 0.1) {
        this.log('warn', 'Audio files have different durations, sync may be affected');
        return { synced: false, message: 'Duration mismatch detected' };
      }
      
      // Check sample rates
      const sampleRates = metadata.map(m => {
        const audioStream = m.streams.find(s => s.codec_type === 'audio');
        return audioStream?.sample_rate;
      });
      
      const uniqueSampleRates = [...new Set(sampleRates)];
      if (uniqueSampleRates.length > 1) {
        this.log('warn', 'Audio files have different sample rates');
        return { synced: false, message: 'Sample rate mismatch detected' };
      }
      
      return { synced: true, message: 'All audio files are synced' };
    } catch (error) {
      return this.handleError('ensureAudioSync', error);
    }
  }

  /**
   * Get audio file metadata
   * @param audioPath - Path to audio file
   * @returns Audio metadata
   */
  public async getAudioMetadata(audioPath: string): Promise<AudioServiceMetadata> {
    this.ensureInitialized();

    try {
      const metadata = await this.probeFile(audioPath);
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      return {
        duration: Math.round(metadata.format.duration || 0),
        codec: audioStream?.codec_name,
        sample_rate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        bit_rate: metadata.format.bit_rate,
        size: metadata.format.size
      };
    } catch (error) {
      return this.handleError('getAudioMetadata', error);
    }
  }

  /**
   * Normalize audio levels
   * @param inputPath - Path to input audio file
   * @param targetLevel - Target level in dB (default: -23)
   * @returns Path to normalized file
   */
  public async normalizeAudio(inputPath: string, targetLevel: number = -23): Promise<string> {
    this.ensureInitialized();

    try {
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(this.cacheDir, `${fileName}_normalized.mp3`);
      
      return new Promise<string>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioFilters(`loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`)
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .on('end', () => {
            this.log('info', `Audio normalized: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `Normalization error: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      return this.handleError('normalizeAudio', error);
    }
  }
}

// ==================== Default Export ====================

/**
 * Create and export a singleton instance
 */
let audioServiceInstance: AudioService | null = null;

export function getAudioService(): AudioService {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService();
  }
  return audioServiceInstance;
}

export default AudioService;
