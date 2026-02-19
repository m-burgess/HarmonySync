/**
 * YouTube Service
 * Handles YouTube-specific operations including video transcoding for upload,
 * link management, and YouTube-compatible format conversion.
 */

import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { BaseElectronService, IYouTubeService, ServiceConfig } from '@harmonysync/core';

/**
 * YouTube video metadata interface
 */
interface YouTubeMetadata {
  duration: number;
  size: number;
  videoCodec?: string;
  audioCodec?: string;
  resolution: string;
}

/**
 * YouTube validation result interface
 */
interface YouTubeValidationResult {
  isValid: boolean;
  issues: string[];
  metadata: YouTubeMetadata;
}

/**
 * Transcoding progress callback interface
 */
interface TranscodingProgress {
  file_name: string;
  progress: number;
  message: string;
}

/**
 * Progress callback type
 */
type ProgressCallback = (progress: TranscodingProgress) => void;

/**
 * Embed options interface
 */
interface EmbedOptions {
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
  mute?: boolean;
  start?: number;
  end?: number;
}

/**
 * YouTube Service Implementation
 * Handles YouTube video operations and conversions
 */
export class YouTubeService extends BaseElectronService implements IYouTubeService {
  protected readonly serviceName = 'YouTubeService';

  private cacheDir: string;

  constructor(config?: ServiceConfig) {
    super(config);
    this.cacheDir = this.getCacheDir();
  }

  /**
   * Initialize the YouTube service
   */
  protected override async onInitialize(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    this.log('info', 'YouTube service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'YouTube service disposed');
  }

  /**
   * Download YouTube video (placeholder - requires external tool)
   * @param _url - YouTube URL
   * @param _outputPath - Output path for downloaded video
   */
  public async download(_url: string, _outputPath: string): Promise<string> {
    // Note: Actual downloading requires external tools like yt-dlp or youtube-dl
    // This is a placeholder implementation
    this.log('warn', 'YouTube download requires external tools (yt-dlp or youtube-dl)');
    throw new Error('YouTube download not implemented. Use external tools like yt-dlp.');
  }

  /**
   * Get YouTube video information
   * @param url - YouTube URL
   */
  public async getInfo(url: string): Promise<{ videoId: string | null; embedUrl: string; thumbnailUrl: string }> {
    try {
      const videoId = this.extractYouTubeId(url);

      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      return {
        videoId,
        embedUrl: this.generateEmbedUrl(videoId),
        thumbnailUrl: this.getYouTubeThumbnailUrl(videoId)
      };
    } catch (error) {
      this.handleError('getInfo', error);
    }
  }

  /**
   * Transcode video for YouTube upload
   * Uses YouTube's recommended encoding settings
   * @param inputPath - Path to input video
   * @param progressCallback - Optional progress callback
   * @returns Path to YouTube-ready video
   */
  public async transcodeForYouTube(inputPath: string, progressCallback?: ProgressCallback): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(this.cacheDir, `${fileName}_youtube.mp4`);

      // Check if already transcoded
      if (fs.existsSync(outputPath)) {
        this.log('info', `YouTube-ready video already exists: ${outputPath}`);
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
          .on('progress', (progress: any) => {
            if (progressCallback && totalDuration > 0) {
              const currentTime = this.parseTimemark(progress.timemark);
              const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
              progressCallback({
                file_name: fileName,
                progress: percent,
                message: `Transcoding for YouTube: ${fileName}...`
              });
            }
          })
          .on('end', () => {
            this.log('info', `YouTube transcoding complete: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err: Error) => {
            this.log('error', `YouTube transcoding error: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
    });
  }

  /**
   * Validate video meets YouTube requirements
   * @param videoPath - Path to the video file
   * @returns Validation result with isValid and issues array
   */
  public async validateForYouTube(videoPath: string): Promise<YouTubeValidationResult> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe video: ${err.message}`));
          return;
        }

        const issues: string[] = [];
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        // Check file size (YouTube limit: 256GB, but practical limit much lower)
        const fileSizeMB = (metadata.format.size || 0) / (1024 * 1024);
        if (fileSizeMB > 128000) { // 128GB practical limit
          issues.push('File size exceeds 128GB');
        }

        // Check duration (YouTube limit: 12 hours for verified accounts)
        const durationHours = (metadata.format.duration || 0) / 3600;
        if (durationHours > 12) {
          issues.push('Video duration exceeds 12 hours');
        }

        // Check resolution
        if (videoStream) {
          const width = videoStream.width || 0;
          const height = videoStream.height || 0;

          // YouTube supports up to 8K (7680x4320)
          if (width > 7680 || height > 4320) {
            issues.push('Resolution exceeds 8K (7680x4320)');
          }
        }

        // Check video codec
        if (videoStream && !['h264', 'vp9', 'av1'].includes(videoStream.codec_name || '')) {
          issues.push(`Video codec ${videoStream.codec_name} may not be optimal for YouTube`);
        }

        // Check audio codec
        if (audioStream && !['aac', 'mp3', 'vorbis', 'opus'].includes(audioStream.codec_name || '')) {
          issues.push(`Audio codec ${audioStream.codec_name} may not be optimal for YouTube`);
        }

        resolve({
          isValid: issues.length === 0,
          issues: issues,
          metadata: {
            duration: metadata.format.duration || 0,
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
   * Extract YouTube video ID from URL
   * @param url - YouTube URL
   * @returns YouTube video ID or null
   */
  public extractYouTubeId(url: string): string | null {
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
   * @param videoIdOrUrl - YouTube video ID or URL
   * @param quality - Thumbnail quality: 'default', 'medium', 'high', 'standard', 'maxres'
   * @returns Thumbnail URL
   */
  public getYouTubeThumbnailUrl(videoIdOrUrl: string, quality: string = 'high'): string {
    const videoId = this.extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;

    const qualityMap: Record<string, string> = {
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
   * @param url - URL to validate
   * @returns True if valid YouTube URL
   */
  public isValidYouTubeUrl(url: string): boolean {
    return this.extractYouTubeId(url) !== null;
  }

  /**
   * Generate YouTube embed URL
   * @param videoIdOrUrl - YouTube video ID or URL
   * @param options - Embed options (autoplay, loop, controls, etc.)
   * @returns YouTube embed URL
   */
  public generateEmbedUrl(videoIdOrUrl: string, options: EmbedOptions = {}): string {
    const videoId = this.extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
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

  /**
   * Get cache directory for YouTube operations
   */
  private getCacheDir(): string {
    const appData = app.getPath('userData');
    const cacheDir = path.join(appData, 'harmonysync', 'cache', 'youtube');
    return cacheDir;
  }

  /**
   * Parse FFmpeg timemark to seconds
   */
  private parseTimemark(timemark: string | number): number {
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

}

// Export for backward compatibility
export function createYouTubeService(config?: ServiceConfig): YouTubeService {
  return new YouTubeService(config);
}

// Singleton instance for backward compatibility
const defaultInstance = new YouTubeService();

// Export function-based API for backward compatibility
export async function transcodeForYouTube(inputPath: string, progressCallback?: ProgressCallback): Promise<string> {
  return defaultInstance.transcodeForYouTube(inputPath, progressCallback);
}

export async function validateForYouTube(videoPath: string): Promise<YouTubeValidationResult> {
  return defaultInstance.validateForYouTube(videoPath);
}


export function extractYouTubeId(url: string): string | null {
  return defaultInstance.extractYouTubeId(url);
}

export function getYouTubeThumbnailUrl(videoIdOrUrl: string, quality?: string): string {
  return defaultInstance.getYouTubeThumbnailUrl(videoIdOrUrl, quality);
}

export function isValidYouTubeUrl(url: string): boolean {
  return defaultInstance.isValidYouTubeUrl(url);
}

export function generateEmbedUrl(videoIdOrUrl: string, options?: EmbedOptions): string {
  return defaultInstance.generateEmbedUrl(videoIdOrUrl, options);
}

// Export utility functions for standalone use (kept for convenience)
export const youtubeUtils = {
  extractYouTubeId,
  getYouTubeThumbnailUrl,
  isValidYouTubeUrl,
  generateEmbedUrl
};
