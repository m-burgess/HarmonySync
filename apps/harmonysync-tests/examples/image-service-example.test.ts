/**
 * Example Test File - Image Service
 * Demonstrates how to use the shared image mocks for testing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MockSharp,
  MockImageJobManager,
  MockImageCache,
  createMockImageService
} from '@harmonysync-tests/mocks';

describe('Example: Image Service with Shared Mocks', () => {
  let jobManager: MockImageJobManager;
  let cache: MockImageCache;

  beforeEach(() => {
    jobManager = new MockImageJobManager();
    cache = new MockImageCache();
  });

  afterEach(() => {
    jobManager.clear();
    cache.clear();
  });

  describe('Sharp Image Processing', () => {
    test('should resize an image', async () => {
      const sharp = new MockSharp('/path/to/image.png');
      
      const result = await sharp
        .resize(800, 600)
        .png({ quality: 90 })
        .toFile('/path/to/output.png');
      
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.format).toBe('png');
    });

    test('should get image metadata', async () => {
      const sharp = new MockSharp('/path/to/image.jpg');
      const metadata = await sharp.metadata();
      
      expect(metadata).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        format: expect.any(String),
        size: expect.any(Number)
      });
    });

    test('should chain operations', async () => {
      const sharp = new MockSharp(Buffer.from('image-data'));
      
      await sharp
        .resize(1024, 768)
        .rotate(90)
        .jpeg({ quality: 85 })
        .toFile('/output.jpg');
      
      const ops = sharp._getOperations();
      expect(ops).toHaveLength(3);
      expect(ops[0].type).toBe('resize');
      expect(ops[1].type).toBe('rotate');
      expect(ops[2].type).toBe('format');
    });

    test('should convert to buffer', async () => {
      const sharp = new MockSharp('/path/to/image.png');
      const buffer = await sharp.resize(200, 200).toBuffer();
      
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Job Management', () => {
    test('should create image processing jobs', () => {
      const jobId = jobManager.createJob('thumbnail', '/image.png', '/thumb.png');
      
      const job = jobManager.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.type).toBe('thumbnail');
      expect(job?.status).toBe('pending');
    });

    test('should process jobs', async () => {
      const jobId = jobManager.createJob('resize', '/image.png');
      
      await jobManager.startJob(jobId);
      await new Promise(r => setTimeout(r, 150));
      
      const job = jobManager.getJob(jobId);
      expect(job?.status).toBe('completed');
    });

    test('should emit job events', (done) => {
      const events: string[] = [];
      
      jobManager.on('job_created', () => events.push('created'));
      jobManager.on('job_started', () => events.push('started'));
      jobManager.on('job_completed', () => events.push('completed'));
      
      const jobId = jobManager.createJob('overlay', '/image.png');
      jobManager.startJob(jobId);
      
      setTimeout(() => {
        expect(events).toEqual(['created', 'started', 'completed']);
        done();
      }, 150);
    });

    test('should track multiple jobs', () => {
      jobManager.createJob('thumbnail', '/image1.png');
      jobManager.createJob('resize', '/image2.png');
      jobManager.createJob('overlay', '/image3.png');
      
      const allJobs = jobManager.getAllJobs();
      expect(allJobs).toHaveLength(3);
    });

    test('should handle job failures', () => {
      const jobId = jobManager.createJob('thumbnail', '/invalid.png');
      jobManager.failJob(jobId, 'File not found');
      
      const job = jobManager.getJob(jobId);
      expect(job?.status).toBe('error');
      expect(job?.error).toBe('File not found');
    });
  });

  describe('Image Cache', () => {
    test('should cache processed images', () => {
      cache.set('thumb:image.png', '/cache/thumb.png', 50000);
      
      const cached = cache.get('thumb:image.png');
      expect(cached).toBe('/cache/thumb.png');
    });

    test('should check cache existence', () => {
      cache.set('key1', '/path1.png');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    test('should track cache size', () => {
      cache.set('key1', '/path1.png', 100000);
      cache.set('key2', '/path2.png', 50000);
      
      expect(cache.getSize()).toBe(150000);
      expect(cache.getCount()).toBe(2);
    });

    test('should clear cache', () => {
      cache.set('key1', '/path1.png');
      cache.set('key2', '/path2.png');
      
      const cleared = cache.clear();
      
      expect(cleared).toBe(2);
      expect(cache.getCount()).toBe(0);
      expect(cache.getSize()).toBe(0);
    });

    test('should delete specific items', () => {
      cache.set('key1', '/path1.png', 100);
      cache.set('key2', '/path2.png', 100);
      
      const deleted = cache.delete('key1');
      
      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.getSize()).toBe(100);
    });

    test('should evict old items when full', () => {
      // Small cache for testing
      const smallCache = new MockImageCache();
      (smallCache as any).maxSize = 200;
      
      smallCache.set('key1', '/path1.png', 100);
      smallCache.set('key2', '/path2.png', 100);
      
      // This should evict key1 (oldest)
      smallCache.set('key3', '/path3.png', 50);
      
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);
    });
  });

  describe('Image Service Integration', () => {
    test('should use mock image service', async () => {
      const service = createMockImageService();
      
      const thumbnail = await service.generateThumbnail('/image.png', 200, 200);
      expect(thumbnail).toContain('_thumb');
      
      const overlay = await service.addTextOverlay('/image.png', 'Hello World');
      expect(overlay).toContain('_overlay');
    });

    test('should cache thumbnails', async () => {
      const service = createMockImageService();
      
      // First call - not cached
      const thumb1 = await service.generateThumbnail('/image.png', 200, 200);
      
      // Second call - should hit cache
      const thumb2 = await service.generateThumbnail('/image.png', 200, 200);
      
      expect(thumb1).toBe(thumb2);
      expect(service.cache.getCount()).toBeGreaterThan(0);
    });

    test('should import PPTX slides', async () => {
      const service = createMockImageService();
      
      const slides = await service.importPPTX('/presentation.pptx', '/output');
      
      expect(slides).toHaveLength(5);
      expect(slides[0]).toContain('slide_1.png');
    });

    test('should import PDF pages', async () => {
      const service = createMockImageService();
      
      const pages = await service.importPDF('/document.pdf', '/output');
      
      expect(pages).toHaveLength(3);
      expect(pages[0]).toContain('page_1.png');
    });

    test('should clear cache', async () => {
      const service = createMockImageService();
      
      await service.generateThumbnail('/image1.png');
      await service.generateThumbnail('/image2.png');
      
      const cleared = await service.clearCache();
      
      expect(cleared).toBeGreaterThan(0);
      expect(service.getCacheSize()).toBe(0);
    });

    test('should track active jobs', async () => {
      const service = createMockImageService();
      
      service.generateThumbnail('/image1.png');
      service.addTextOverlay('/image2.png', 'Text');
      
      // Jobs complete quickly in mock, but we can check they were created
      const allJobs = service.jobManager.getAllJobs();
      expect(allJobs.length).toBeGreaterThan(0);
    });
  });
});
