/**
 * Video Service
 * Handles video-related operations including metadata extraction, transcoding,
 * thumbnail generation, frame extraction, and optimization for web streaming.
 */

import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { BaseElectronService, IVideoService, ServiceConfig } from '@harmonysync/core';
import { VideoMetadata } from '@harmonysync/core';

/**
 * Video metadata extended with additional properties
 */
interface ExtendedVideoMetadata extends VideoMetadata {
  format: string;
  bitrate: number;
  size: number;
  audio_codec?: string;
  video_codec?: string;
}

/**
 * Video Service Implementation
 * Provides comprehensive video processing capabilities
 */
export class VideoService extends BaseElectronService implements IVideoService {
  protected readonly serviceName = 'VideoService';

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the video service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Video service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Video service disposed');
  }

  /**
   * Get comprehensive video metadata
   * @param filePath - Path to the video file
   * @returns Video metadata including duration, dimensions, codecs
   */
  public async getMetadata(filePath: string): Promise<ExtendedVideoMetadata> {
    try {
      const metadata = await this.probeFile(filePath);

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

      return {
        duration: Math.round(metadata.format.duration || 0),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps: videoStream?.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : 0,
        bitrate: metadata.format.bit_rate || 0,
        format: metadata.format.format_name || 'unknown',
        codec: videoStream?.codec_name,
        hasAudio: !!audioStream,
        audio_codec: audioStream?.codec_name,
        video_codec: videoStream?.codec_name,
        size: metadata.format.size || 0,
      };
    } catch (error) {
      this.handleError('getMetadata', error);
    }
  }

  /**
   * Transcode video for compatibility
   * Converts videos to H.264/AAC format for broad compatibility
   * @param inputPath - Path to input video
   * @param outputPath - Optional output path (defaults to cache directory)
   * @returns Path to transcoded video
   */
  public async transcode(inputPath: string, onProgress?: (progress: any) => void, outputPath?: string): Promise<string> {
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
              if (onProgress) {
                onProgress({
                  percent,
                  currentTime,
                  totalTime: totalDuration,
                  message: `Transcoding ${fileName}...`
                });
              }
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
      this.handleError('transcode', error);
    }
  }

  /**
   * Generate video thumbnail
   * @param videoPath - Path to the video file
   * @param outputPath - Optional output path (defaults to cache directory)
   * @returns Path to generated thumbnail
   */
  public async generateThumbnail(videoPath: string, outputPath?: string): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const thumbnailName = `${uuidv4()}.png`;
      const thumbnailPath = outputPath || path.join(cacheDir, thumbnailName);

      return new Promise<string>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [3],
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
   * Extract video frames at specific intervals
   * @param videoPath - Path to the video file
   * @param intervalSeconds - Interval between frames in seconds
   * @returns Array of frame image paths
   */
  public async extractFrames(videoPath: string, intervalSeconds: number = 5): Promise<string[]> {
    try {
      const metadata = await this.getMetadata(videoPath);
      const duration = metadata.duration;
      const frameCount = Math.floor(duration / intervalSeconds);
      const cacheDir = this.getCacheDir();
      const framesDir = path.join(cacheDir, 'frames', uuidv4());
      await fs.ensureDir(framesDir);

      const timestamps: number[] = [];
      for (let i = 0; i < frameCount; i++) {
        timestamps.push(i * intervalSeconds);
      }

      return new Promise<string[]>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: timestamps,
            filename: 'frame_%i.png',
            folder: framesDir,
            size: '640x480',
          })
          .on('end', async () => {
            const files = await fs.readdir(framesDir);
            const framePaths = files.map((f) => path.join(framesDir, f));
            this.log('info', `Extracted ${framePaths.length} frames from video`);
            resolve(framePaths);
          })
          .on('error', (err: Error) => {
            this.log('error', `Frame extraction error: ${err.message}`);
            reject(err);
          });
      });
    } catch (error) {
      this.handleError('extractFrames', error);
    }
  }

  /**
   * Get video duration in seconds
   * @param videoPath - Path to the video file
   * @returns Duration in seconds
   */
  public async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const metadata = await this.getMetadata(videoPath);
      return metadata.duration;
    } catch (error) {
      this.handleError('getVideoDuration', error);
    }
  }

  /**
   * Check if video needs transcoding for compatibility
   * @param videoPath - Path to the video file
   * @returns True if transcoding is needed
   */
  public async needsTranscoding(videoPath: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(videoPath);

      // Check if video codec is H.264 and audio is AAC
      const videoCodecOk = metadata.video_codec === 'h264';
      const audioCodecOk = !metadata.audio_codec || metadata.audio_codec === 'aac';

      return !(videoCodecOk && audioCodecOk);
    } catch (error) {
      this.log('error', 'Error checking transcode need:', error);
      return true; // Assume transcoding needed on error
    }
  }

  /**
   * Optimize video for web streaming
   * @param inputPath - Path to input video
   * @returns Path to optimized video
   */
  public async optimizeForStreaming(inputPath: string): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(cacheDir, `${fileName}_optimized.mp4`);

      return new Promise<string>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset fast',
            '-crf 22',
            '-movflags +faststart', // Enable progressive streaming
            '-pix_fmt yuv420p',
          ])
          .on('end', () => {
            this.log('info', `Video optimized for streaming: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `Optimization error: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      this.handleError('optimizeForStreaming', error);
    }
  }

  /**
   * Get cache directory for video operations
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
   * Parse frame rate string (e.g., "30/1" to 30)
   * @param frameRate - Frame rate string
   * @returns Frame rate as number
   */
  private parseFrameRate(frameRate: string): number {
    if (!frameRate) return 0;
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0], 10);
      const denominator = parseInt(parts[1], 10);
      return denominator > 0 ? numerator / denominator : 0;
    }
    return parseFloat(frameRate);
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
          reject(new Error(`Failed to probe video: ${err.message}`));
          return;
        }
        resolve(metadata);
      });
    });
  }
}

// Export singleton instance
let videoServiceInstance: VideoService | null = null;

/**
 * Get or create the video service singleton
 */
export function getVideoService(config?: ServiceConfig): VideoService {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService(config);
  }
  return videoServiceInstance;
}

// Export for backward compatibility
export default VideoService;
