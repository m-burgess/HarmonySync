/**
 * Shared Video Service Mocks
 * Mock implementations for video service components used across tests
 */

import { EventEmitter } from 'events';
import type { VideoMetadata, TranscodeProgress, VideoJob } from '@harmonysync/core';

/**
 * Mock FFmpeg command builder
 */
export class MockFFmpegCommand extends EventEmitter {
  private input: string;
  private outputPath: string = '';
  private options: any = {};

  constructor(input: string) {
    super();
    this.input = input;
  }

  videoCodec(codec: string): this {
    this.options.videoCodec = codec;
    return this;
  }

  audioCodec(codec: string): this {
    this.options.audioCodec = codec;
    return this;
  }

  size(size: string): this {
    this.options.size = size;
    return this;
  }

  fps(fps: number): this {
    this.options.fps = fps;
    return this;
  }

  videoBitrate(bitrate: string): this {
    this.options.videoBitrate = bitrate;
    return this;
  }

  audioBitrate(bitrate: string): this {
    this.options.audioBitrate = bitrate;
    return this;
  }

  format(format: string): this {
    this.options.format = format;
    return this;
  }

  noAudio(): this {
    this.options.noAudio = true;
    return this;
  }

  seekInput(time: number | string): this {
    this.options.seekInput = time;
    return this;
  }

  frames(count: number): this {
    this.options.frames = count;
    return this;
  }

  output(path: string): this {
    this.outputPath = path;
    return this;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }

  run(): void {
    // Simulate async processing
    setTimeout(() => {
      // Emit progress events
      this.emit('progress', { percent: 25 });
      setTimeout(() => {
        this.emit('progress', { percent: 50 });
        setTimeout(() => {
          this.emit('progress', { percent: 75 });
          setTimeout(() => {
            this.emit('progress', { percent: 100 });
            this.emit('end');
          }, 50);
        }, 50);
      }, 50);
    }, 50);
  }

  save(path: string): void {
    this.outputPath = path;
    this.run();
  }

  // Test helper
  _simulateError(error: Error): void {
    setTimeout(() => {
      this.emit('error', error);
    }, 50);
  }
}

/**
 * Mock FFmpeg factory
 */
export class MockFFmpeg {
  static createCommand(input: string): MockFFmpegCommand {
    return new MockFFmpegCommand(input);
  }

  static async ffprobe(path: string): Promise<VideoMetadata> {
    return {
      duration: 120,
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 5000000,
      format: 'mp4',
      codec: 'h264',
      hasAudio: true
    };
  }

  static setFfmpegPath(path: string): void {
    // Mock implementation
  }

  static setFfprobePath(path: string): void {
    // Mock implementation
  }
}

/**
 * Mock Video Service Job Manager
 */
export class MockVideoJobManager extends EventEmitter {
  private jobs: Map<string, VideoJob> = new Map();
  private activeJobs: Set<string> = new Set();

  createJob(type: 'transcode' | 'thumbnail' | 'metadata', inputPath: string, outputPath?: string): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const job: VideoJob = {
      id,
      type,
      inputPath,
      outputPath,
      status: 'pending',
      createdAt: new Date()
    };
    this.jobs.set(id, job);
    this.emit('job_created', { job });
    return id;
  }

  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.add(jobId);
    this.emit('job_started', { job });

    // Simulate processing
    setTimeout(() => {
      this.completeJob(jobId);
    }, 100);
  }

  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.status = 'completed';
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.emit('job_completed', { job });
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.status = 'error';
    job.error = error;
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.emit('job_failed', { job, error });
  }

  getJob(jobId: string): VideoJob | undefined {
    return this.jobs.get(jobId);
  }

  getActiveJobs(): VideoJob[] {
    return Array.from(this.activeJobs).map(id => this.jobs.get(id)!).filter(Boolean);
  }

  getAllJobs(): VideoJob[] {
    return Array.from(this.jobs.values());
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'processing') return false;
    
    job.status = 'error';
    job.error = 'Cancelled';
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.emit('job_cancelled', { job });
    return true;
  }

  clearCompletedJobs(): number {
    let count = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'error') {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.jobs.clear();
    this.activeJobs.clear();
  }
}

/**
 * Mock video processing utilities
 */
export const mockVideoUtils = {
  async extractFrame(videoPath: string, timestamp: number): Promise<Buffer> {
    return Buffer.from('mock-frame-data');
  },

  async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    return MockFFmpeg.ffprobe(videoPath);
  },

  async generateThumbnail(videoPath: string, outputPath: string, timestamp: number = 0): Promise<string> {
    return outputPath;
  },

  async transcode(inputPath: string, outputPath: string, options: any = {}): Promise<string> {
    return outputPath;
  },

  validateVideoFile(path: string): boolean {
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return validExtensions.some(ext => path.toLowerCase().endsWith(ext));
  },

  estimateTranscodeTime(duration: number, quality: string): number {
    const multipliers: Record<string, number> = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    };
    return duration * (multipliers[quality] || 1);
  }
};

/**
 * Create mock video service for testing
 */
export function createMockVideoService() {
  const jobManager = new MockVideoJobManager();
  const ffmpeg = MockFFmpeg;

  return {
    jobManager,
    ffmpeg,
    
    async getMetadata(filePath: string): Promise<VideoMetadata> {
      return ffmpeg.ffprobe(filePath);
    },

    async transcode(inputPath: string, outputPath?: string, options?: any): Promise<string> {
      const output = outputPath || inputPath.replace(/\.[^.]+$/, '_transcoded.mp4');
      const jobId = jobManager.createJob('transcode', inputPath, output);
      await jobManager.startJob(jobId);
      return output;
    },

    async generateThumbnail(videoPath: string, outputPath?: string, timestamp: number = 0): Promise<string> {
      const output = outputPath || videoPath.replace(/\.[^.]+$/, '_thumb.jpg');
      const jobId = jobManager.createJob('thumbnail', videoPath, output);
      await jobManager.startJob(jobId);
      return output;
    },

    getActiveJobs(): VideoJob[] {
      return jobManager.getActiveJobs();
    },

    clear(): void {
      jobManager.clear();
    }
  };
}
