/**
 * Shared Mocks Index
 * Central export point for all mock implementations
 */

// Audio Service Mocks
export {
  MockAudioTrack,
  MockAudioMixer,
  MockAudic,
  createMockSocketServer,
  createMockSocketClient
} from './audio-service';

// Video Service Mocks
export {
  MockFFmpegCommand,
  MockFFmpeg,
  MockVideoJobManager,
  mockVideoUtils,
  createMockVideoService
} from './video-service';

// Image Service Mocks
export {
  MockSharp,
  MockImageJobManager,
  MockImageCache,
  mockImageUtils,
  MockPPTXConverter,
  MockPDFConverter,
  createMockImageService
} from './image-service';

// Re-export testing types for convenience
export * from '../types/testing';
