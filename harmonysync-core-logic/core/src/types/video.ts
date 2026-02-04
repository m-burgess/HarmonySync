/**
 * Video Service Type Definitions
 * Shared types for video service operations
 */

import { VideoMetadata, ImageMetadata } from './models';

// Re-export for convenience
export type { VideoMetadata, ImageMetadata };

// ==================== Video Processing Types ====================

export interface TranscodeOptions {
  outputFormat?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  removeAudio?: boolean;
}

export interface TranscodeProgress {
  percent: number;
  processedFrames?: number;
  totalFrames?: number;
  currentTime?: number;
  totalTime?: number;
  fps?: number;
  bitrate?: number;
  message?: string;
}

export interface VideoThumbnailOptions {
  timestamp?: number;
  width?: number;
  height?: number;
  format?: 'jpg' | 'png' | 'webp';
  quality?: number;
}

// ==================== REST API Request/Response Types ====================

export interface GetMetadataRequest {
  filePath: string;
}

export interface GetMetadataResponse {
  metadata: VideoMetadata;
}

export interface TranscodeRequest {
  inputPath: string;
  outputPath?: string;
  options?: TranscodeOptions;
}

export interface TranscodeResponse {
  outputPath: string;
  duration: number;
  size: number;
}

export interface VideoGenerateThumbnailRequest {
  videoPath: string;
  outputPath?: string;
  options?: VideoThumbnailOptions;
}

export interface VideoGenerateThumbnailResponse {
  thumbnailPath: string;
}

export interface VideoHealthResponse {
  status: string;
  service: string;
  version: string;
  activeJobs: number;
}

export interface VideoErrorResponse {
  error: string;
  message?: string;
}

// ==================== Video Service Events ====================

export type VideoServiceEvent =
  | 'transcode_started'
  | 'transcode_progress'
  | 'transcode_completed'
  | 'transcode_error'
  | 'thumbnail_generated'
  | 'metadata_extracted';

export interface VideoServiceEventData {
  'transcode_started': { jobId: string; inputPath: string };
  'transcode_progress': { jobId: string; progress: TranscodeProgress };
  'transcode_completed': { jobId: string; outputPath: string };
  'transcode_error': { jobId: string; error: string };
  'thumbnail_generated': { videoPath: string; thumbnailPath: string };
  'metadata_extracted': { filePath: string; metadata: VideoMetadata };
}

// ==================== Job Management ====================

export interface VideoJob {
  id: string;
  type: 'transcode' | 'thumbnail' | 'metadata';
  inputPath: string;
  outputPath?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: TranscodeProgress;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
