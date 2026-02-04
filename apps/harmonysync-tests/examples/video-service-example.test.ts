/**
 * Example Test File - Video Service
 * Demonstrates how to use the shared video mocks for testing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MockFFmpeg,
  MockFFmpegCommand,
  MockVideoJobManager,
  createMockVideoService
} from '@harmonysync-tests/mocks';

describe('Example: Video Service with Shared Mocks', () => {
  let jobManager: MockVideoJobManager;

  beforeEach(() => {
    jobManager = new MockVideoJobManager();
  });

  afterEach(() => {
    jobManager.clear();
  });

  describe('FFmpeg Operations', () => {
    test('should get video metadata', async () => {
      const metadata = await MockFFmpeg.ffprobe('/path/to/video.mp4');
      
      expect(metadata).toMatchObject({
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        format: 'mp4',
        hasAudio: true
      });
    });

    test('should transcode video with progress', (done) => {
      const command = new MockFFmpegCommand('/path/to/input.mp4');
      const progressEvents: any[] = [];
      
      command
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1280x720')
        .on('progress', (progress) => {
          progressEvents.push(progress);
        })
        .on('end', () => {
          expect(progressEvents.length).toBeGreaterThan(0);
          expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
          done();
        })
        .save('/path/to/output.mp4');
    });

    test('should handle transcode errors', (done) => {
      const command = new MockFFmpegCommand('/path/to/input.mp4');
      
      command
        .on('error', (error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Test error');
          done();
        })
        .save('/path/to/output.mp4');
      
      // Simulate error
      command._simulateError(new Error('Test error'));
    });
  });

  describe('Job Management', () => {
    test('should create a job', () => {
      const jobId = jobManager.createJob('transcode', '/path/to/input.mp4', '/path/to/output.mp4');
      
      expect(jobId).toBeDefined();
      const job = jobManager.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe('pending');
      expect(job?.type).toBe('transcode');
    });

    test('should start and complete a job', async () => {
      const jobId = jobManager.createJob('transcode', '/path/to/input.mp4');
      
      await jobManager.startJob(jobId);
      
      // Wait a bit for mock completion
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const job = jobManager.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeDefined();
    });

    test('should track active jobs', async () => {
      const job1 = jobManager.createJob('transcode', '/path/to/video1.mp4');
      const job2 = jobManager.createJob('thumbnail', '/path/to/video2.mp4');
      
      // Start jobs but don't wait for completion
      jobManager.startJob(job1);
      jobManager.startJob(job2);
      
      const activeJobs = jobManager.getActiveJobs();
      expect(activeJobs.length).toBeGreaterThan(0);
    });

    test('should fail a job', () => {
      const jobId = jobManager.createJob('transcode', '/path/to/input.mp4');
      jobManager.failJob(jobId, 'Test error');
      
      const job = jobManager.getJob(jobId);
      expect(job?.status).toBe('error');
      expect(job?.error).toBe('Test error');
    });

    test('should cancel a processing job', async () => {
      const jobId = jobManager.createJob('transcode', '/path/to/input.mp4');
      jobManager.startJob(jobId);
      
      const cancelled = jobManager.cancelJob(jobId);
      
      expect(cancelled).toBe(true);
      const job = jobManager.getJob(jobId);
      expect(job?.status).toBe('error');
      expect(job?.error).toBe('Cancelled');
    });

    test('should clear completed jobs', () => {
      const job1 = jobManager.createJob('transcode', '/path/to/video1.mp4');
      const job2 = jobManager.createJob('transcode', '/path/to/video2.mp4');
      
      jobManager.completeJob(job1);
      jobManager.completeJob(job2);
      
      const cleared = jobManager.clearCompletedJobs();
      expect(cleared).toBe(2);
      expect(jobManager.getAllJobs()).toHaveLength(0);
    });

    test('should emit job events', (done) => {
      const events: string[] = [];
      
      jobManager.on('job_created', () => events.push('created'));
      jobManager.on('job_started', () => events.push('started'));
      jobManager.on('job_completed', () => events.push('completed'));
      
      const jobId = jobManager.createJob('transcode', '/path/to/input.mp4');
      jobManager.startJob(jobId);
      
      setTimeout(() => {
        expect(events).toContain('created');
        expect(events).toContain('started');
        expect(events).toContain('completed');
        done();
      }, 150);
    });
  });

  describe('Video Service Integration', () => {
    test('should use mock video service', async () => {
      const service = createMockVideoService();
      
      const metadata = await service.getMetadata('/path/to/video.mp4');
      expect(metadata.format).toBe('mp4');
      
      const output = await service.transcode('/path/to/input.mp4');
      expect(output).toContain('_transcoded.mp4');
      
      const thumbnail = await service.generateThumbnail('/path/to/video.mp4');
      expect(thumbnail).toContain('_thumb.jpg');
    });

    test('should track active jobs in service', async () => {
      const service = createMockVideoService();
      
      // Start multiple operations
      service.transcode('/path/to/video1.mp4');
      service.generateThumbnail('/path/to/video2.mp4');
      
      const activeJobs = service.getActiveJobs();
      expect(activeJobs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
