/**
 * Tests for Video Service
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { VideoService } from '../video-service';
import { VideoMetadata } from '../../types/models';

// Mock ffmpeg
jest.mock('fluent-ffmpeg');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-userdata'),
  },
}));

describe('Video Service', () => {
  let tempDir: string;
  let service: VideoService;
  let mockFfmpegInstance: any;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = path.join(os.tmpdir(), 'video-service-test-' + Date.now());
    await fs.ensureDir(tempDir);

    // Reset mocks
    jest.clearAllMocks();

    // Create mock ffmpeg instance
    mockFfmpegInstance = {
      videoCodec: jest.fn().mockReturnThis(),
      audioCodec: jest.fn().mockReturnThis(),
      audioBitrate: jest.fn().mockReturnThis(),
      videoFilters: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      screenshots: jest.fn().mockReturnThis(),
      save: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    };

    // Mock ffmpeg constructor
    (ffmpeg as unknown as jest.Mock).mockReturnValue(mockFfmpegInstance);

    // Create service instance
    service = new VideoService();
    await service.initialize();
  });

  afterEach(async () => {
    // Dispose service
    service.dispose();

    // Clean up temporary directory
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Service Lifecycle', () => {
    it('should initialize successfully', async () => {
      const newService = new VideoService();
      await newService.initialize();
      expect(newService.isInitialized()).toBe(true);
      newService.dispose();
    });

    it('should dispose successfully', () => {
      expect(() => service.dispose()).not.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should extract complete video metadata', async () => {
      const testVideoPath = path.join(tempDir, 'test.mp4');
      await fs.writeFile(testVideoPath, 'dummy video content');

      const mockMetadata = {
        format: {
          duration: 120.5,
          format_name: 'mp4',
          bit_rate: 5000000,
          size: 15000000,
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
          },
        ],
      };

      // Mock ffprobe
      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const metadata = await service.getMetadata(testVideoPath);

      expect(metadata).toBeDefined();
      expect(metadata.duration).toBe(121); // Math.round(120.5) = 121
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.fps).toBe(30);
      expect(metadata.codec).toBe('h264');
      expect(metadata.hasAudio).toBe(true);
      expect(metadata.format).toBe('mp4');
      expect(metadata.bitrate).toBe(5000000);
      expect(metadata.size).toBe(15000000);
      expect(metadata.audio_codec).toBe('aac');
      expect(metadata.video_codec).toBe('h264');
    });

    it('should handle video without audio', async () => {
      const testVideoPath = path.join(tempDir, 'test-no-audio.mp4');
      await fs.writeFile(testVideoPath, 'dummy video content');

      const mockMetadata = {
        format: {
          duration: 60,
          format_name: 'mp4',
          bit_rate: 3000000,
          size: 10000000,
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1280,
            height: 720,
            r_frame_rate: '24/1',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const metadata = await service.getMetadata(testVideoPath);

      expect(metadata.hasAudio).toBe(false);
      expect(metadata.audio_codec).toBeUndefined();
    });

    it('should handle missing metadata fields gracefully', async () => {
      const testVideoPath = path.join(tempDir, 'test-minimal.mp4');
      await fs.writeFile(testVideoPath, 'dummy video content');

      const mockMetadata = {
        format: {},
        streams: [],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const metadata = await service.getMetadata(testVideoPath);

      expect(metadata.duration).toBe(0);
      expect(metadata.width).toBe(0);
      expect(metadata.height).toBe(0);
      expect(metadata.fps).toBe(0);
      expect(metadata.hasAudio).toBe(false);
    });

    it('should handle ffprobe errors', async () => {
      const testVideoPath = path.join(tempDir, 'test-error.mp4');

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(new Error('Failed to probe file'), null);
      });

      await expect(service.getMetadata(testVideoPath)).rejects.toThrow();
    });
  });

  describe('transcode', () => {
    it('should transcode video with default settings', async () => {
      const inputPath = path.join(tempDir, 'input.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 60 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      // Mock the 'end' event to be called immediately
      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      const outputPath = await service.transcode(inputPath);

      expect(outputPath).toBeDefined();
      expect(outputPath).toContain('_transcoded.mp4');
      expect(mockFfmpegInstance.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockFfmpegInstance.audioCodec).toHaveBeenCalledWith('aac');
      expect(mockFfmpegInstance.audioBitrate).toHaveBeenCalledWith('128k');
    });

    it('should use custom output path if provided', async () => {
      const inputPath = path.join(tempDir, 'input.mp4');
      const customOutputPath = path.join(tempDir, 'custom-output.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 60 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      const outputPath = await service.transcode(inputPath, customOutputPath);

      expect(outputPath).toBe(customOutputPath);
    });

    it('should skip transcoding if output already exists', async () => {
      const inputPath = path.join(tempDir, 'input.mp4');
      const outputPath = path.join(tempDir, 'input_transcoded.mp4');
      await fs.writeFile(inputPath, 'dummy video content');
      await fs.writeFile(outputPath, 'existing transcoded content');

      const result = await service.transcode(inputPath, outputPath);

      expect(result).toBe(outputPath);
      expect(mockFfmpegInstance.save).not.toHaveBeenCalled();
    });

    it('should handle transcoding errors', async () => {
      const inputPath = path.join(tempDir, 'input-error.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 60 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Transcoding failed')), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.transcode(inputPath)).rejects.toThrow('Transcoding failed');
    });

    it('should track progress during transcoding', async () => {
      const inputPath = path.join(tempDir, 'input.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 100 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      let progressCalled = false;
      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'progress') {
          progressCalled = true;
          handler({ timemark: '00:00:50.00' });
        } else if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      await service.transcode(inputPath);

      expect(progressCalled).toBe(true);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail at default timestamp', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      const thumbnailPath = await service.generateThumbnail(videoPath);

      expect(thumbnailPath).toBeDefined();
      expect(thumbnailPath).toContain('.png');
      expect(mockFfmpegInstance.screenshots).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamps: [3],
          size: '320x240',
        })
      );
    });

    it('should use custom output path if provided', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      const customThumbPath = path.join(tempDir, 'custom-thumb.png');
      await fs.writeFile(videoPath, 'dummy video content');

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      const thumbnailPath = await service.generateThumbnail(videoPath, customThumbPath);

      expect(thumbnailPath).toBe(customThumbPath);
    });

    it('should handle thumbnail generation errors', async () => {
      const videoPath = path.join(tempDir, 'video-error.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Thumbnail generation failed')), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.generateThumbnail(videoPath)).rejects.toThrow('Thumbnail generation failed');
    });
  });

  describe('extractFrames', () => {
    it('should extract frames at specified intervals', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 30 },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(async () => {
            // Create dummy frame files
            const framesDir = (mockFfmpegInstance.screenshots as jest.Mock).mock.calls[0][0].folder;
            await fs.ensureDir(framesDir);
            await fs.writeFile(path.join(framesDir, 'frame_0.png'), 'frame0');
            await fs.writeFile(path.join(framesDir, 'frame_1.png'), 'frame1');
            await fs.writeFile(path.join(framesDir, 'frame_2.png'), 'frame2');
            handler();
          }, 0);
        }
        return mockFfmpegInstance;
      });

      const frames = await service.extractFrames(videoPath, 10);

      expect(frames).toBeDefined();
      expect(Array.isArray(frames)).toBe(true);
    });

    it('should handle frame extraction errors', async () => {
      const videoPath = path.join(tempDir, 'video-error.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 30 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Frame extraction failed')), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.extractFrames(videoPath)).rejects.toThrow('Frame extraction failed');
    });
  });

  describe('getVideoDuration', () => {
    it('should return video duration in seconds', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: { duration: 125.75 },
        streams: [{ codec_type: 'video' }],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const duration = await service.getVideoDuration(videoPath);

      expect(duration).toBe(126); // Rounded
    });

    it('should handle duration extraction errors', async () => {
      const videoPath = path.join(tempDir, 'video-error.mp4');

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(new Error('Failed to get duration'), null);
      });

      await expect(service.getVideoDuration(videoPath)).rejects.toThrow();
    });
  });

  describe('needsTranscoding', () => {
    it('should return false for H.264/AAC video', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: {},
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const needs = await service.needsTranscoding(videoPath);

      expect(needs).toBe(false);
    });

    it('should return false for H.264 video without audio', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: {},
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const needs = await service.needsTranscoding(videoPath);

      expect(needs).toBe(false);
    });

    it('should return true for non-H.264 video', async () => {
      const videoPath = path.join(tempDir, 'video.avi');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: {},
        streams: [
          {
            codec_type: 'video',
            codec_name: 'mpeg4',
          },
          {
            codec_type: 'audio',
            codec_name: 'mp3',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const needs = await service.needsTranscoding(videoPath);

      expect(needs).toBe(true);
    });

    it('should return true for H.264 with non-AAC audio', async () => {
      const videoPath = path.join(tempDir, 'video.mp4');
      await fs.writeFile(videoPath, 'dummy video content');

      const mockMetadata = {
        format: {},
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
          },
          {
            codec_type: 'audio',
            codec_name: 'mp3',
          },
        ],
      };

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(null, mockMetadata);
      });

      const needs = await service.needsTranscoding(videoPath);

      expect(needs).toBe(true);
    });

    it('should return true on metadata error', async () => {
      const videoPath = path.join(tempDir, 'video-error.mp4');

      (ffmpeg.ffprobe as jest.Mock) = jest.fn((filePath, callback) => {
        callback(new Error('Failed to probe'), null);
      });

      const needs = await service.needsTranscoding(videoPath);

      expect(needs).toBe(true);
    });
  });

  describe('optimizeForStreaming', () => {
    it('should optimize video for streaming', async () => {
      const inputPath = path.join(tempDir, 'input.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegInstance;
      });

      const outputPath = await service.optimizeForStreaming(inputPath);

      expect(outputPath).toBeDefined();
      expect(outputPath).toContain('_optimized.mp4');
      expect(mockFfmpegInstance.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockFfmpegInstance.audioCodec).toHaveBeenCalledWith('aac');
      expect(mockFfmpegInstance.outputOptions).toHaveBeenCalledWith([
        '-preset fast',
        '-crf 22',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
      ]);
    });

    it('should handle optimization errors', async () => {
      const inputPath = path.join(tempDir, 'input-error.mp4');
      await fs.writeFile(inputPath, 'dummy video content');

      mockFfmpegInstance.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Optimization failed')), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.optimizeForStreaming(inputPath)).rejects.toThrow('Optimization failed');
    });
  });

  describe('Helper Methods', () => {
    describe('parseTimemark', () => {
      it('should parse HH:MM:SS.MS format', () => {
        // Access private method through type assertion
        const parseTimemark = (service as any).parseTimemark.bind(service);
        
        expect(parseTimemark('01:30:45.50')).toBe(5445.5);
        expect(parseTimemark('00:05:30.25')).toBe(330.25);
        expect(parseTimemark('02:00:00.00')).toBe(7200);
      });

      it('should parse MM:SS.MS format', () => {
        const parseTimemark = (service as any).parseTimemark.bind(service);
        
        expect(parseTimemark('05:30.25')).toBe(330.25);
        expect(parseTimemark('00:45.00')).toBe(45);
      });

      it('should handle numeric input', () => {
        const parseTimemark = (service as any).parseTimemark.bind(service);
        
        expect(parseTimemark(123.45)).toBe(123.45);
        expect(parseTimemark(0)).toBe(0);
      });

      it('should handle invalid input', () => {
        const parseTimemark = (service as any).parseTimemark.bind(service);
        
        expect(parseTimemark(null)).toBe(0);
        expect(parseTimemark(undefined)).toBe(0);
        // Empty string parseFloat returns NaN
        expect(isNaN(parseTimemark(''))).toBe(true);
      });
    });

    describe('parseFrameRate', () => {
      it('should parse fraction format', () => {
        const parseFrameRate = (service as any).parseFrameRate.bind(service);
        
        expect(parseFrameRate('30/1')).toBe(30);
        expect(parseFrameRate('60/2')).toBe(30);
        expect(parseFrameRate('24000/1001')).toBeCloseTo(23.976, 2);
      });

      it('should parse decimal format', () => {
        const parseFrameRate = (service as any).parseFrameRate.bind(service);
        
        expect(parseFrameRate('29.97')).toBe(29.97);
        expect(parseFrameRate('60')).toBe(60);
      });

      it('should handle invalid input', () => {
        const parseFrameRate = (service as any).parseFrameRate.bind(service);
        
        expect(parseFrameRate('')).toBe(0);
        expect(parseFrameRate(null)).toBe(0);
        expect(parseFrameRate('30/0')).toBe(0);
      });
    });
  });
});
