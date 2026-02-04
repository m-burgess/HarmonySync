/**
 * Image Service Type Definitions
 * Shared types for image service operations
 */

import { ImageMetadata } from './models';

// Re-export ImageMetadata for convenience
export type { ImageMetadata };

// ==================== Image Processing Types ====================

export interface ImageTextOverlayOptions {
  text: string;
  position?: {
    x: number | 'center' | 'left' | 'right';
    y: number | 'center' | 'top' | 'bottom';
  };
  font?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  opacity?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ImageThumbnailOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  format?: 'jpg' | 'png' | 'webp';
  quality?: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: string;
}

export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RotateOptions {
  angle: number;
  background?: string;
}

// ==================== Slide Import Types ====================

export interface ImportPPTXOptions {
  outputDir: string;
  format?: 'png' | 'jpg';
  width?: number;
  height?: number;
  quality?: number;
}

export interface ImportPDFOptions {
  outputDir: string;
  format?: 'png' | 'jpg';
  dpi?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export interface SlideImportResult {
  slides: string[];
  totalSlides: number;
  duration: number;
}

// ==================== REST API Request/Response Types ====================

export interface AddTextOverlayRequest {
  imagePath: string;
  text: string;
  options?: ImageTextOverlayOptions;
}

export interface AddTextOverlayResponse {
  outputPath: string;
}

export interface ImageGenerateThumbnailRequest {
  imagePath: string;
  options?: ImageThumbnailOptions;
}

export interface ImageGenerateThumbnailResponse {
  thumbnailPath: string;
  cached: boolean;
}

export interface ImportPPTXRequest {
  pptxPath: string;
  outputDir: string;
  options?: ImportPPTXOptions;
}

export interface ImportPDFRequest {
  pdfPath: string;
  outputDir: string;
  options?: ImportPDFOptions;
}

export interface ImportSlidesResponse {
  slides: string[];
  totalSlides: number;
}

export interface ClearCacheResponse {
  cleared: boolean;
  itemsCleared: number;
}

export interface ImageHealthResponse {
  status: string;
  service: string;
  version: string;
  activeJobs: number;
  cacheSize?: number;
}

export interface ImageErrorResponse {
  error: string;
  message?: string;
}

// ==================== Image Service Events ====================

export type ImageServiceEvent =
  | 'image_processed'
  | 'thumbnail_generated'
  | 'slides_imported'
  | 'cache_cleared'
  | 'processing_error';

export interface ImageServiceEventData {
  'image_processed': { inputPath: string; outputPath: string; operation: string };
  'thumbnail_generated': { imagePath: string; thumbnailPath: string; cached: boolean };
  'slides_imported': { sourceFile: string; slides: string[]; totalSlides: number };
  'cache_cleared': { itemsCleared: number };
  'processing_error': { operation: string; error: string };
}

// ==================== Job Management ====================

export interface ImageJob {
  id: string;
  type: 'overlay' | 'thumbnail' | 'import' | 'resize' | 'crop' | 'rotate';
  inputPath: string;
  outputPath?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
