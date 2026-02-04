/**
 * Shared Image Service Mocks
 * Mock implementations for image service components used across tests
 */

import { EventEmitter } from 'events';
import type { ImageMetadata, ImageJob } from '@harmonysync/core';

/**
 * Mock Sharp (image processing library) implementation
 */
export class MockSharp {
  private input: string | Buffer;
  private operations: any[] = [];
  private metadata_: ImageMetadata;

  constructor(input: string | Buffer) {
    this.input = input;
    this.metadata_ = {
      width: 1920,
      height: 1080,
      format: 'png',
      size: 1024000
    };
  }

  resize(width?: number, height?: number, options?: any): this {
    this.operations.push({ type: 'resize', width, height, options });
    if (width) this.metadata_.width = width;
    if (height) this.metadata_.height = height;
    return this;
  }

  rotate(angle?: number): this {
    this.operations.push({ type: 'rotate', angle });
    return this;
  }

  crop(options: any): this {
    this.operations.push({ type: 'crop', options });
    return this;
  }

  composite(images: any[]): this {
    this.operations.push({ type: 'composite', images });
    return this;
  }

  png(options?: any): this {
    this.operations.push({ type: 'format', format: 'png', options });
    this.metadata_.format = 'png';
    return this;
  }

  jpeg(options?: any): this {
    this.operations.push({ type: 'format', format: 'jpeg', options });
    this.metadata_.format = 'jpeg';
    return this;
  }

  webp(options?: any): this {
    this.operations.push({ type: 'format', format: 'webp', options });
    this.metadata_.format = 'webp';
    return this;
  }

  toFile(path: string): Promise<any> {
    return Promise.resolve({
      format: this.metadata_.format,
      width: this.metadata_.width,
      height: this.metadata_.height,
      size: this.metadata_.size
    });
  }

  toBuffer(): Promise<Buffer> {
    return Promise.resolve(Buffer.from('mock-image-buffer'));
  }

  async metadata(): Promise<ImageMetadata> {
    return this.metadata_;
  }

  // Test helpers
  _setMetadata(metadata: Partial<ImageMetadata>): void {
    Object.assign(this.metadata_, metadata);
  }

  _getOperations(): any[] {
    return this.operations;
  }

  static mockInstance: any = null;

  static setMockInstance(instance: any): void {
    MockSharp.mockInstance = instance;
  }
}

/**
 * Mock Image Service Job Manager
 */
export class MockImageJobManager extends EventEmitter {
  private jobs: Map<string, ImageJob> = new Map();
  private activeJobs: Set<string> = new Set();

  createJob(
    type: 'overlay' | 'thumbnail' | 'import' | 'resize' | 'crop' | 'rotate',
    inputPath: string,
    outputPath?: string
  ): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const job: ImageJob = {
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

  getJob(jobId: string): ImageJob | undefined {
    return this.jobs.get(jobId);
  }

  getActiveJobs(): ImageJob[] {
    return Array.from(this.activeJobs).map(id => this.jobs.get(id)!).filter(Boolean);
  }

  getAllJobs(): ImageJob[] {
    return Array.from(this.jobs.values());
  }

  clear(): void {
    this.jobs.clear();
    this.activeJobs.clear();
  }
}

/**
 * Mock image cache manager
 */
export class MockImageCache {
  private cache: Map<string, { path: string; timestamp: number; size: number }> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100MB
  private currentSize: number = 0;

  set(key: string, path: string, size: number = 1024): void {
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    this.cache.set(key, {
      path,
      timestamp: Date.now(),
      size
    });
    this.currentSize += size;

    // Simple LRU eviction
    while (this.currentSize > this.maxSize) {
      this.evictOldest();
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry) {
      // Update timestamp for LRU
      entry.timestamp = Date.now();
      return entry.path;
    }
    return null;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): number {
    const count = this.cache.size;
    this.cache.clear();
    this.currentSize = 0;
    return count;
  }

  getSize(): number {
    return this.currentSize;
  }

  getCount(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

/**
 * Mock image processing utilities
 */
export const mockImageUtils = {
  async addTextOverlay(imagePath: string, text: string, options: any = {}): Promise<string> {
    const outputPath = imagePath.replace(/(\.[^.]+)$/, '_overlay$1');
    return outputPath;
  },

  async generateThumbnail(imagePath: string, width: number = 200, height: number = 200): Promise<string> {
    const outputPath = imagePath.replace(/(\.[^.]+)$/, '_thumb$1');
    return outputPath;
  },

  async resize(imagePath: string, width?: number, height?: number): Promise<string> {
    const outputPath = imagePath.replace(/(\.[^.]+)$/, '_resized$1');
    return outputPath;
  },

  async crop(imagePath: string, options: any): Promise<string> {
    const outputPath = imagePath.replace(/(\.[^.]+)$/, '_cropped$1');
    return outputPath;
  },

  async rotate(imagePath: string, angle: number): Promise<string> {
    const outputPath = imagePath.replace(/(\.[^.]+)$/, '_rotated$1');
    return outputPath;
  },

  async getMetadata(imagePath: string): Promise<ImageMetadata> {
    return {
      width: 1920,
      height: 1080,
      format: 'png',
      size: 1024000
    };
  },

  validateImageFile(path: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
    return validExtensions.some(ext => path.toLowerCase().endsWith(ext));
  },

  generateCacheKey(operation: string, ...params: any[]): string {
    return `${operation}:${params.join(':')}`;
  }
};

/**
 * Mock PPTX to images converter
 */
export class MockPPTXConverter {
  async convert(pptxPath: string, outputDir: string): Promise<string[]> {
    // Simulate converting 5 slides
    const slides = [];
    for (let i = 1; i <= 5; i++) {
      slides.push(`${outputDir}/slide_${i}.png`);
    }
    return slides;
  }

  async getSlideCount(pptxPath: string): Promise<number> {
    return 5;
  }
}

/**
 * Mock PDF to images converter
 */
export class MockPDFConverter {
  async convert(pdfPath: string, outputDir: string, dpi: number = 150): Promise<string[]> {
    // Simulate converting 3 pages
    const pages = [];
    for (let i = 1; i <= 3; i++) {
      pages.push(`${outputDir}/page_${i}.png`);
    }
    return pages;
  }

  async getPageCount(pdfPath: string): Promise<number> {
    return 3;
  }
}

/**
 * Create mock image service for testing
 */
export function createMockImageService() {
  const jobManager = new MockImageJobManager();
  const cache = new MockImageCache();

  return {
    jobManager,
    cache,
    
    async addTextOverlay(imagePath: string, text: string, options: any = {}): Promise<string> {
      const outputPath = mockImageUtils.addTextOverlay(imagePath, text, options);
      const jobId = jobManager.createJob('overlay', imagePath, await outputPath);
      await jobManager.startJob(jobId);
      return outputPath;
    },

    async generateThumbnail(imagePath: string, width?: number, height?: number): Promise<string> {
      const cacheKey = mockImageUtils.generateCacheKey('thumbnail', imagePath, width, height);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const outputPath = await mockImageUtils.generateThumbnail(imagePath, width, height);
      cache.set(cacheKey, outputPath);
      const jobId = jobManager.createJob('thumbnail', imagePath, outputPath);
      await jobManager.startJob(jobId);
      return outputPath;
    },

    async importPPTX(pptxPath: string, outputDir: string): Promise<string[]> {
      const converter = new MockPPTXConverter();
      const slides = await converter.convert(pptxPath, outputDir);
      const jobId = jobManager.createJob('import', pptxPath, outputDir);
      await jobManager.startJob(jobId);
      return slides;
    },

    async importPDF(pdfPath: string, outputDir: string): Promise<string[]> {
      const converter = new MockPDFConverter();
      const pages = await converter.convert(pdfPath, outputDir);
      const jobId = jobManager.createJob('import', pdfPath, outputDir);
      await jobManager.startJob(jobId);
      return pages;
    },

    async clearCache(): Promise<number> {
      return cache.clear();
    },

    getActiveJobs(): ImageJob[] {
      return jobManager.getActiveJobs();
    },

    getCacheSize(): number {
      return cache.getSize();
    },

    clear(): void {
      jobManager.clear();
      cache.clear();
    }
  };
}
