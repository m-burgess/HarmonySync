/**
 * Tests for Audio Service
 */

import { AudioService } from '../audio-service';
import * as path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
import * as fs from 'fs-extra';

// Mock fluent-ffmpeg
jest.mock('fluent-ffmpeg');
import ffmpeg from 'fluent-ffmpeg';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: '/mock/userData',
        appData: '/mock/appData',
        temp: '/mock/temp',
        home: '/mock/home'
      };
      return paths[name] || '/mock/default';
    })
  }
}));

// Type definitions for mocks
interface MockFFmpegCommand {
  audioCodec: jest.Mock;
  audioBitrate: jest.Mock;
  audioQuality: jest.Mock;
  audioFilters: jest.Mock;
  on: jest.Mock;
  save: jest.Mock;
}

interface FFprobeCallback {
  (err: Error | null, metadata?: any): void;
}

describe('AudioService', () => {
  let service: AudioService;
  let mockFfmpegCommand: MockFFmpegCommand;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup fs-extra mocks
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDirSync as unknown as jest.Mock).mockReturnValue(undefined);
    (fs.readdir as unknown as jest.Mock).mockResolvedValue([]);
    (fs.copy as unknown as jest.Mock).mockResolvedValue(undefined);

    // Setup ffmpeg mock command
    mockFfmpegCommand = {
      audioCodec: jest.fn().mockReturnThis(),
      audioBitrate: jest.fn().mockReturnThis(),
      audioQuality: jest.fn().mockReturnThis(),
      audioFilters: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      save: jest.fn().mockReturnThis()
    };

    // Setup ffmpeg factory mock
    (ffmpeg as any).mockImplementation(() => mockFfmpegCommand);
    
    // Setup ffprobe mock
    (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
      callback(null, {
        format: {
          duration: 180,
          bit_rate: '128000',
          size: '2304000'
        },
        streams: [
          {
            codec_type: 'audio',
            codec_name: 'mp3',
            sample_rate: '44100',
            channels: 2
          }
        ]
      });
    });

    // Create service instance
    service = new AudioService();
  });

  afterEach(() => {
    if (service && service.isInitialized()) {
      service.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it('should create cache directory on initialization', async () => {
      await service.initialize();
      expect(fs.ensureDirSync).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize(); // Should handle gracefully
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should dispose cleanly', async () => {
      await service.initialize();
      expect(() => service.dispose()).not.toThrow();
      expect(service.isInitialized()).toBe(false);
    });

    it('should throw error if methods called before initialization', async () => {
      await expect(
        service.convertToOgg('/input/test.mp3', '/output')
      ).rejects.toThrow('AudioService is not initialized');
    });
  });

  describe('convertToOgg', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should convert audio file to Ogg format', async () => {
      const inputPath = '/input/test.mp3';
      const outputDir = '/output';
      const expectedOutput = path.join(outputDir, 'test.ogg');

      // Setup mock to simulate successful conversion
      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.convertToOgg(inputPath, outputDir);

      expect(result).toBe(expectedOutput);
      expect(fs.ensureDir).toHaveBeenCalledWith(outputDir);
      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalledWith('libvorbis');
      expect(mockFfmpegCommand.audioBitrate).toHaveBeenCalledWith('128k');
      expect(mockFfmpegCommand.audioQuality).toHaveBeenCalledWith(4);
      expect(mockFfmpegCommand.save).toHaveBeenCalledWith(expectedOutput);
    });

    it('should call progress callback during conversion', async () => {
      const progressCallback = jest.fn();
      const inputPath = '/input/test.mp3';
      const outputDir = '/output';

      // Setup mock to simulate progress and completion
      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'progress') {
          setTimeout(() => handler({ timemark: '00:01:30' }), 0);
        } else if (event === 'end') {
          setTimeout(() => handler(), 10);
        }
        return mockFfmpegCommand;
      });

      await service.convertToOgg(inputPath, outputDir, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      const call = progressCallback.mock.calls[0][0];
      expect(call).toHaveProperty('percent');
      expect(call).toHaveProperty('currentTime');
      expect(call).toHaveProperty('totalTime');
      expect(call).toHaveProperty('message');
    });

    it('should handle conversion errors', async () => {
      const inputPath = '/input/test.mp3';
      const outputDir = '/output';
      const error = new Error('Conversion failed');

      // Setup mock to simulate error
      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          setTimeout(() => handler(error), 0);
        }
        return mockFfmpegCommand;
      });

      await expect(service.convertToOgg(inputPath, outputDir)).rejects.toThrow('Conversion failed');
    });
  });

  describe('transposeAudio', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should transpose audio files by positive semitones', async () => {
      const songPath = '/songs/test-song';
      const semitones = 2;
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'vocals.mp3',
        'guitar.mp3'
      ]);

      // Setup mock to simulate successful transposition
      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.transposeAudio(songPath, semitones);

      expect(result.outputDir).toBe(path.join(songPath, 'transposed_up_2'));
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0].name).toBe('vocals');
      expect(result.tracks[1].name).toBe('guitar');
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(songPath, 'transposed_up_2'));
    });

    it('should transpose audio files by negative semitones', async () => {
      const songPath = '/songs/test-song';
      const semitones = -3;
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['vocals.mp3']);

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.transposeAudio(songPath, semitones);

      expect(result.outputDir).toBe(path.join(songPath, 'transposed_down_3'));
    });

    it('should not transpose rhythm section tracks', async () => {
      const songPath = '/songs/test-song';
      const semitones = 2;
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'vocals.mp3',
        'drums.mp3',
        'guide.mp3',
        'click.wav'
      ]);

      let transposeCallCount = 0;
      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          transposeCallCount++;
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.transposeAudio(songPath, semitones);

      // Only vocals should be transposed, drums/guide/click should be copied
      expect(result.tracks).toHaveLength(4);
      expect(fs.copy).toHaveBeenCalledTimes(3); // drums, guide, click
      expect(transposeCallCount).toBe(1); // only vocals
    });

    it('should apply correct audio filters for transposition', async () => {
      const songPath = '/songs/test-song';
      const semitones = 2;
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['vocals.mp3']);

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      await service.transposeAudio(songPath, semitones);

      const expectedRate = 44100 * Math.pow(2, 2 / 12);
      expect(mockFfmpegCommand.audioFilters).toHaveBeenCalledWith([
        `asetrate=${expectedRate}`,
        'aresample=44100'
      ]);
    });

    it('should call progress callback with transposed tracks', async () => {
      const songPath = '/songs/test-song';
      const semitones = 2;
      const progressCallback = jest.fn();
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['vocals.mp3']);

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      await service.transposeAudio(songPath, semitones, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'vocals',
            filePath: expect.stringContaining('vocals.mp3')
          })
        ])
      );
    });

    it('should filter only audio file extensions', async () => {
      const songPath = '/songs/test-song';
      const semitones = 2;
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'vocals.mp3',
        'guitar.wav',
        'notes.txt',
        'image.jpg',
        'bass.ogg',
        'keys.flac'
      ]);

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.transposeAudio(songPath, semitones);

      // Only audio files should be processed
      expect(result.tracks).toHaveLength(4); // mp3, wav, ogg, flac
      expect(result.tracks.every(t => 
        t.name === 'vocals' || t.name === 'guitar' || t.name === 'bass' || t.name === 'keys'
      )).toBe(true);
    });
  });

  describe('ensureAudioSync', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return synced status for files with matching durations', async () => {
      const audioFiles = ['/track1.mp3', '/track2.mp3', '/track3.mp3'];

      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callback(null, {
          format: { duration: 180 },
          streams: [
            {
              codec_type: 'audio',
              sample_rate: '44100'
            }
          ]
        });
      });

      const result = await service.ensureAudioSync(audioFiles);

      expect(result.synced).toBe(true);
      expect(result.message).toBe('All audio files are synced');
    });

    it('should detect duration mismatch', async () => {
      const audioFiles = ['/track1.mp3', '/track2.mp3'];

      let callCount = 0;
      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callCount++;
        callback(null, {
          format: { duration: callCount === 1 ? 180 : 200 },
          streams: [
            {
              codec_type: 'audio',
              sample_rate: '44100'
            }
          ]
        });
      });

      const result = await service.ensureAudioSync(audioFiles);

      expect(result.synced).toBe(false);
      expect(result.message).toBe('Duration mismatch detected');
    });

    it('should detect sample rate mismatch', async () => {
      const audioFiles = ['/track1.mp3', '/track2.mp3'];

      let callCount = 0;
      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callCount++;
        callback(null, {
          format: { duration: 180 },
          streams: [
            {
              codec_type: 'audio',
              sample_rate: callCount === 1 ? '44100' : '48000'
            }
          ]
        });
      });

      const result = await service.ensureAudioSync(audioFiles);

      expect(result.synced).toBe(false);
      expect(result.message).toBe('Sample rate mismatch detected');
    });

    it('should allow small duration differences within tolerance', async () => {
      const audioFiles = ['/track1.mp3', '/track2.mp3'];

      let callCount = 0;
      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callCount++;
        callback(null, {
          format: { duration: callCount === 1 ? 180.0 : 180.05 },
          streams: [
            {
              codec_type: 'audio',
              sample_rate: '44100'
            }
          ]
        });
      });

      const result = await service.ensureAudioSync(audioFiles);

      expect(result.synced).toBe(true);
    });
  });

  describe('getAudioMetadata', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should retrieve audio metadata', async () => {
      const audioPath = '/test/audio.mp3';

      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callback(null, {
          format: {
            duration: 180,
            bit_rate: '128000',
            size: '2304000'
          },
          streams: [
            {
              codec_type: 'audio',
              codec_name: 'mp3',
              sample_rate: '44100',
              channels: 2
            }
          ]
        });
      });

      const metadata = await service.getAudioMetadata(audioPath);

      expect(metadata.duration).toBe(180);
      expect(metadata.codec).toBe('mp3');
      expect(metadata.sample_rate).toBe('44100');
      expect(metadata.channels).toBe(2);
      expect(metadata.bit_rate).toBe('128000');
      expect(metadata.size).toBe('2304000');
    });

    it('should handle files without audio stream', async () => {
      const audioPath = '/test/video.mp4';

      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callback(null, {
          format: {
            duration: 120
          },
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264'
            }
          ]
        });
      });

      const metadata = await service.getAudioMetadata(audioPath);

      expect(metadata.duration).toBe(120);
      expect(metadata.codec).toBeUndefined();
      expect(metadata.sample_rate).toBeUndefined();
    });

    it('should handle probe errors', async () => {
      const audioPath = '/test/invalid.mp3';

      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callback(new Error('File not found'));
      });

      await expect(service.getAudioMetadata(audioPath)).rejects.toThrow('Failed to probe file');
    });
  });

  describe('normalizeAudio', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should normalize audio with default target level', async () => {
      const inputPath = '/input/test.mp3';

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      const result = await service.normalizeAudio(inputPath);

      expect(result).toContain('test_normalized.mp3');
      expect(mockFfmpegCommand.audioFilters).toHaveBeenCalledWith('loudnorm=I=-23:TP=-1.5:LRA=11');
      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalledWith('libmp3lame');
      expect(mockFfmpegCommand.audioBitrate).toHaveBeenCalledWith('192k');
    });

    it('should normalize audio with custom target level', async () => {
      const inputPath = '/input/test.mp3';
      const targetLevel = -16;

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return mockFfmpegCommand;
      });

      await service.normalizeAudio(inputPath, targetLevel);

      expect(mockFfmpegCommand.audioFilters).toHaveBeenCalledWith('loudnorm=I=-16:TP=-1.5:LRA=11');
    });

    it('should handle normalization errors', async () => {
      const inputPath = '/input/test.mp3';
      const error = new Error('Normalization failed');

      mockFfmpegCommand.on.mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          setTimeout(() => handler(error), 0);
        }
        return mockFfmpegCommand;
      });

      await expect(service.normalizeAudio(inputPath)).rejects.toThrow('Normalization failed');
    });
  });

  describe('Helper Methods', () => {
    it('should parse timemark in HH:MM:SS format', () => {
      // Access private method through type casting
      const parseTimemark = (service as any).parseTimemark.bind(service);
      
      expect(parseTimemark('00:01:30')).toBe(90);
      expect(parseTimemark('01:00:00')).toBe(3600);
      expect(parseTimemark('00:00:30.5')).toBe(30.5);
    });

    it('should parse timemark in MM:SS format', () => {
      const parseTimemark = (service as any).parseTimemark.bind(service);
      
      expect(parseTimemark('01:30')).toBe(90);
      expect(parseTimemark('05:45')).toBe(345);
    });

    it('should parse numeric timemark', () => {
      const parseTimemark = (service as any).parseTimemark.bind(service);
      
      expect(parseTimemark(120)).toBe(120);
      expect(parseTimemark('90')).toBe(90);
    });

    it('should handle invalid timemark', () => {
      const parseTimemark = (service as any).parseTimemark.bind(service);
      
      expect(parseTimemark('')).toBeNaN();
      expect(parseTimemark('invalid')).toBeNaN();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should emit error events on failures', async () => {
      const errorHandler = jest.fn();
      service.on('error', errorHandler);

      (ffmpeg as any).ffprobe = jest.fn((filePath: string, callback: FFprobeCallback) => {
        callback(new Error('Probe failed'));
      });

      await expect(service.getAudioMetadata('/test/file.mp3')).rejects.toThrow();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0]).toHaveProperty('operation', 'getAudioMetadata');
    });
  });

  describe('Service Lifecycle Events', () => {
    it('should emit initialized event', (done) => {
      service.on('initialized', () => {
        expect(service.isInitialized()).toBe(true);
        done();
      });

      service.initialize();
    });

    it('should emit disposed event', (done) => {
      service.initialize().then(() => {
        service.on('disposed', () => {
          expect(service.isInitialized()).toBe(false);
          done();
        });

        service.dispose();
      });
    });
  });
});
