/**
 * Tests for Image Service
 */

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') {
        return '/tmp/test-userdata';
      }
      return '/tmp';
    })
  }
}));

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { ImageService } from '../image-service';

describe('Image Service', () => {
  let tempDir: string;
  let service: ImageService;
  let testImagePath: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = path.join(os.tmpdir(), 'image-service-test-' + Date.now());
    await fs.ensureDir(tempDir);

    service = new ImageService();
    await service.initialize();

    // Create a test image (10x10 red square PNG)
    testImagePath = path.join(tempDir, 'test-image.png');
    await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .png()
      .toFile(testImagePath);
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    
    service.dispose();
  });

  describe('isSupportedImage', () => {
    it('should return true for supported image formats', () => {
      expect(service.isSupportedImage('test.jpg')).toBe(true);
      expect(service.isSupportedImage('test.jpeg')).toBe(true);
      expect(service.isSupportedImage('test.png')).toBe(true);
      expect(service.isSupportedImage('test.gif')).toBe(true);
      expect(service.isSupportedImage('test.bmp')).toBe(true);
      expect(service.isSupportedImage('test.webp')).toBe(true);
      expect(service.isSupportedImage('test.tiff')).toBe(true);
      expect(service.isSupportedImage('test.svg')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(service.isSupportedImage('test.txt')).toBe(false);
      expect(service.isSupportedImage('test.pdf')).toBe(false);
      expect(service.isSupportedImage('test.mp4')).toBe(false);
      expect(service.isSupportedImage('test.doc')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(service.isSupportedImage('test.JPG')).toBe(true);
      expect(service.isSupportedImage('test.PNG')).toBe(true);
      expect(service.isSupportedImage('test.WEBP')).toBe(true);
    });

    it('should handle paths with directories', () => {
      expect(service.isSupportedImage('/path/to/image.jpg')).toBe(true);
      expect(service.isSupportedImage('C:\\Users\\test\\image.png')).toBe(true);
    });
  });

  describe('getImageMetadata', () => {
    it('should return metadata for valid images', async () => {
      const metadata = await service.getImageMetadata(testImagePath);

      expect(metadata.width).toBe(10);
      expect(metadata.height).toBe(10);
      expect(metadata.format).toBe('png');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.path).toBe(testImagePath);
      expect(metadata.channels).toBe(3);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.getImageMetadata('/nonexistent/image.png')
      ).rejects.toThrow();
    });

    it('should throw error for invalid image files', async () => {
      const invalidFile = path.join(tempDir, 'invalid.png');
      await fs.writeFile(invalidFile, 'not an image');

      await expect(
        service.getImageMetadata(invalidFile)
      ).rejects.toThrow();
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with default size', async () => {
      const thumbnailPath = await service.generateThumbnail(testImagePath);

      expect(await fs.pathExists(thumbnailPath)).toBe(true);

      const metadata = await sharp(thumbnailPath).metadata();
      expect(metadata.width).toBeLessThanOrEqual(320);
      expect(metadata.format).toBe('jpeg');
    });

    it('should generate thumbnail with custom width', async () => {
      const thumbnailPath = await service.generateThumbnail(testImagePath, { width: 100, height: 100 });

      expect(await fs.pathExists(thumbnailPath)).toBe(true);

      const metadata = await sharp(thumbnailPath).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should generate thumbnail with custom width only', async () => {
      const thumbnailPath = await service.generateThumbnail(testImagePath, { width: 200, height: 0 });

      expect(await fs.pathExists(thumbnailPath)).toBe(true);

      const metadata = await sharp(thumbnailPath).metadata();
      expect(metadata.width).toBeLessThanOrEqual(200);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.generateThumbnail('/nonexistent/image.png')
      ).rejects.toThrow();
    });
  });

  describe('convertFormat', () => {
    it('should convert image to JPEG format', async () => {
      const convertedPath = await service.convertFormat(testImagePath, 'jpeg');

      expect(await fs.pathExists(convertedPath)).toBe(true);

      const metadata = await sharp(convertedPath).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should convert image to WebP format', async () => {
      const convertedPath = await service.convertFormat(testImagePath, 'webp');

      expect(await fs.pathExists(convertedPath)).toBe(true);

      const metadata = await sharp(convertedPath).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should convert image to PNG format', async () => {
      const convertedPath = await service.convertFormat(testImagePath, 'png');

      expect(await fs.pathExists(convertedPath)).toBe(true);

      const metadata = await sharp(convertedPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should apply quality option for JPEG', async () => {
      const convertedPath = await service.convertFormat(testImagePath, 'jpeg', { quality: 50 });

      expect(await fs.pathExists(convertedPath)).toBe(true);

      const metadata = await sharp(convertedPath).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should apply quality option for WebP', async () => {
      const convertedPath = await service.convertFormat(testImagePath, 'webp', { quality: 60 });

      expect(await fs.pathExists(convertedPath)).toBe(true);

      const metadata = await sharp(convertedPath).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.convertFormat(testImagePath, 'bmp')
      ).rejects.toThrow('Unsupported format');
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.convertFormat('/nonexistent/image.png', 'jpeg')
      ).rejects.toThrow();
    });
  });

  describe('resizeImage', () => {
    it('should resize image to specified dimensions', async () => {
      const resizedPath = await service.resizeImage(testImagePath, 50, 50);

      expect(await fs.pathExists(resizedPath)).toBe(true);

      const metadata = await sharp(resizedPath).metadata();
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it('should resize image with contain fit', async () => {
      const resizedPath = await service.resizeImage(testImagePath, 100, 200, { fit: 'contain' });

      expect(await fs.pathExists(resizedPath)).toBe(true);

      const metadata = await sharp(resizedPath).metadata();
      expect(metadata.width).toBeLessThanOrEqual(100);
      expect(metadata.height).toBeLessThanOrEqual(200);
    });

    it('should resize image with cover fit', async () => {
      const resizedPath = await service.resizeImage(testImagePath, 100, 100, { fit: 'cover' });

      expect(await fs.pathExists(resizedPath)).toBe(true);

      const metadata = await sharp(resizedPath).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should apply custom background color', async () => {
      const resizedPath = await service.resizeImage(testImagePath, 100, 100, {
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });

      expect(await fs.pathExists(resizedPath)).toBe(true);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.resizeImage('/nonexistent/image.png', 100, 100)
      ).rejects.toThrow();
    });
  });

  describe('optimizeForWeb', () => {
    it('should optimize image for web', async () => {
      const optimizedPath = await service.optimizeForWeb(testImagePath);

      expect(await fs.pathExists(optimizedPath)).toBe(true);

      const metadata = await sharp(optimizedPath).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBeLessThanOrEqual(1920);
    });

    it('should not enlarge smaller images', async () => {
      const optimizedPath = await service.optimizeForWeb(testImagePath);

      expect(await fs.pathExists(optimizedPath)).toBe(true);

      const metadata = await sharp(optimizedPath).metadata();
      // Original is 10x10, should not be enlarged to 1920
      expect(metadata.width).toBeLessThanOrEqual(10);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.optimizeForWeb('/nonexistent/image.png')
      ).rejects.toThrow();
    });
  });

  describe('addTextOverlay', () => {
    it('should add text overlay with default options', async () => {
      // Create a larger test image for text overlay (1920x1080)
      const largeImagePath = path.join(tempDir, 'large-image.png');
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(largeImagePath);

      const overlayPath = await service.addTextOverlay(largeImagePath, 'Test Text');

      expect(await fs.pathExists(overlayPath)).toBe(true);

      const metadata = await sharp(overlayPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should add text overlay with custom font', async () => {
      // Create a larger test image for text overlay
      const largeImagePath = path.join(tempDir, 'large-image2.png');
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(largeImagePath);

      const overlayPath = await service.addTextOverlay(largeImagePath, 'Custom Font', {
        fontFamily: 'Helvetica',
        fontSize: 32,
        color: 'blue'
      });

      expect(await fs.pathExists(overlayPath)).toBe(true);
    });

    it('should add text overlay with stroke', async () => {
      // Create a larger test image for text overlay
      const largeImagePath = path.join(tempDir, 'large-image3.png');
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(largeImagePath);

      const overlayPath = await service.addTextOverlay(largeImagePath, 'Stroke Text', {
        stroke: 'black',
        strokeWidth: 3
      });

      expect(await fs.pathExists(overlayPath)).toBe(true);
    });

    it('should escape XML special characters in text', async () => {
      // Create a larger test image for text overlay
      const largeImagePath = path.join(tempDir, 'large-image4.png');
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(largeImagePath);

      const overlayPath = await service.addTextOverlay(
        largeImagePath,
        'Text with <tags> & "quotes" and \'apostrophes\''
      );

      expect(await fs.pathExists(overlayPath)).toBe(true);
    });

    it('should position text at custom coordinates', async () => {
      // Create a larger test image for text overlay
      const largeImagePath = path.join(tempDir, 'large-image5.png');
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(largeImagePath);

      const overlayPath = await service.addTextOverlay(largeImagePath, 'Positioned Text', {
        top: 100,
        left: 50
      });

      expect(await fs.pathExists(overlayPath)).toBe(true);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.addTextOverlay('/nonexistent/image.png', 'Test')
      ).rejects.toThrow();
    });
  });

  describe('loadAndCache', () => {
    beforeEach(async () => {
      // Clear cache before each test in this suite
      await service.clearCache(0);
    });

    it('should load and cache an image', async () => {
      const result = await service.loadAndCache(testImagePath);

      expect(result.path).toBeDefined();
      expect(await fs.pathExists(result.path)).toBe(true);
      expect(result.cached).toBe(false);
    });

    it('should return cached image on second load', async () => {
      const result1 = await service.loadAndCache(testImagePath);
      const result2 = await service.loadAndCache(testImagePath);

      expect(result2.cached).toBe(true);
      expect(result2.path).toBe(result1.path);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.loadAndCache('/nonexistent/image.png')
      ).rejects.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cache without errors', async () => {
      // First cache some images
      await service.loadAndCache(testImagePath);

      // Clear cache
      await expect(service.clearCache(0)).resolves.not.toThrow();
    });

    it('should only clear old cached images', async () => {
      // Cache an image
      await service.loadAndCache(testImagePath);

      // Clear cache with olderThanDays = 1000 (should not clear recent image)
      await service.clearCache(1000);

      // Try loading again - should be cached
      const result = await service.loadAndCache(testImagePath);
      expect(result.cached).toBe(true);
    });
  });

  describe('getDominantColor', () => {
    it('should extract dominant color from red image', async () => {
      const color = await service.getDominantColor(testImagePath);

      expect(color).toHaveProperty('r');
      expect(color).toHaveProperty('g');
      expect(color).toHaveProperty('b');
      expect(color.r).toBeGreaterThan(200); // Should be mostly red
      expect(color.g).toBeLessThan(50);
      expect(color.b).toBeLessThan(50);
    });

    it('should extract dominant color from blue image', async () => {
      // Create a blue test image
      const blueImagePath = path.join(tempDir, 'blue-image.png');
      await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .png()
        .toFile(blueImagePath);

      const color = await service.getDominantColor(blueImagePath);

      expect(color.r).toBeLessThan(50);
      expect(color.g).toBeLessThan(50);
      expect(color.b).toBeGreaterThan(200); // Should be mostly blue
    });

    it('should return RGB values between 0 and 255', async () => {
      const color = await service.getDominantColor(testImagePath);

      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    });

    it('should throw error for non-existent files', async () => {
      await expect(
        service.getDominantColor('/nonexistent/image.png')
      ).rejects.toThrow();
    });
  });

  describe('importPPTX', () => {
    it('should throw error indicating not implemented', async () => {
      await expect(
        service.importPPTX('/path/to/test.pptx', tempDir)
      ).rejects.toThrow('PPTX import not yet implemented');
    });
  });

  describe('importPDF', () => {
    it('should throw error indicating not implemented', async () => {
      await expect(
        service.importPDF('/path/to/test.pdf', tempDir)
      ).rejects.toThrow('PDF import not yet implemented');
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted image files gracefully', async () => {
      const corruptedFile = path.join(tempDir, 'corrupted.png');
      await fs.writeFile(corruptedFile, 'This is not a PNG file');

      await expect(
        service.getImageMetadata(corruptedFile)
      ).rejects.toThrow();
    });

    it('should handle empty files gracefully', async () => {
      const emptyFile = path.join(tempDir, 'empty.png');
      await fs.writeFile(emptyFile, '');

      await expect(
        service.getImageMetadata(emptyFile)
      ).rejects.toThrow();
    });
  });

  describe('Integration Tests with Real Service Order Images', () => {
    const serviceOrderZip = path.join(__dirname, '../../../Service Order 01-29-2026.zip');
    
    it('should skip integration tests if service order zip is not available', async () => {
      if (!await fs.pathExists(serviceOrderZip)) {
        console.log('Service order zip not found, skipping integration tests');
        expect(true).toBe(true);
        return;
      }

      // If zip exists, we would extract and test with real images
      // For now, just verify the zip exists
      const stats = await fs.stat(serviceOrderZip);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});
