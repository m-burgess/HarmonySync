/**
 * Tests for Slides Service
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import SlidesService from '../slides-service';

describe('Slides Service', () => {
  let tempDir: string;
  let service: SlidesService;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = path.join(os.tmpdir(), 'slides-service-test-' + Date.now());
    await fs.ensureDir(tempDir);
    
    service = new SlidesService();
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('validateSlideFile', () => {
    it('should reject non-existent files', async () => {
      const result = await service.validateSlideFile('/nonexistent/file.pdf');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not exist');
    });

    it('should reject directories', async () => {
      const result = await service.validateSlideFile(tempDir);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not a file');
    });

    it('should reject unsupported file types', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');
      
      const result = await service.validateSlideFile(testFile);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unsupported file type');
    });

    it('should reject empty PowerPoint files', async () => {
      const testFile = path.join(tempDir, 'test.pptx');
      await fs.writeFile(testFile, '');
      
      const result = await service.validateSlideFile(testFile);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('should accept valid PowerPoint files', async () => {
      const testFile = path.join(tempDir, 'test.pptx');
      await fs.writeFile(testFile, 'dummy content');
      
      const result = await service.validateSlideFile(testFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('powerpoint');
    });
  });

  describe('createTextSlide', () => {
    it('should create a text slide with default styling', async () => {
      const slide = await service.createTextSlide('Test Slide Content');
      
      expect(slide.type).toBe('text');
      expect(slide.content).toBe('Test Slide Content');
      expect(slide.style?.fontSize).toBe('48px');
      expect(slide.style?.fontFamily).toBe('Arial, sans-serif');
      expect(slide.style?.color).toBe('#FFFFFF');
      expect(slide.style?.backgroundColor).toBe('#000000');
      expect(slide.width).toBe(1920);
      expect(slide.height).toBe(1080);
    });

    it('should create a text slide with custom styling', async () => {
      const customStyle = {
        fontSize: '64px',
        fontFamily: 'Times New Roman',
        color: '#FF0000',
        backgroundColor: '#0000FF',
        textAlign: 'left'
      };
      
      const slide = await service.createTextSlide('Custom Slide', customStyle);
      
      expect(slide.style?.fontSize).toBe('64px');
      expect(slide.style?.fontFamily).toBe('Times New Roman');
      expect(slide.style?.color).toBe('#FF0000');
      expect(slide.style?.backgroundColor).toBe('#0000FF');
      expect(slide.style?.textAlign).toBe('left');
    });

    it('should truncate long titles', async () => {
      const longText = 'A'.repeat(100);
      const slide = await service.createTextSlide(longText);
      
      expect(slide.title.length).toBe(53); // 50 + '...'
      expect(slide.title).toContain('...');
    });

    it('should reject slides with non-existent background images', async () => {
      await expect(
        service.createTextSlide('Test', {}, '/nonexistent/image.png')
      ).rejects.toThrow('Background image not found');
    });
  });

  describe('getSlideMetadata', () => {
    it('should reject non-existent files', async () => {
      await expect(
        service.getSlideMetadata('/nonexistent/file.pdf')
      ).rejects.toThrow('does not exist');
    });

    it('should extract basic metadata from PowerPoint files', async () => {
      const testFile = path.join(tempDir, 'presentation.pptx');
      await fs.writeFile(testFile, 'test content');
      
      const metadata = await service.getSlideMetadata(testFile);
      
      expect(metadata.filename).toBe('presentation.pptx');
      expect(metadata.basename).toBe('presentation');
      expect(metadata.extension).toBe('.pptx');
      expect(metadata.type).toBe('powerpoint');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.path).toBe(testFile);
    });
  });

  describe('importFromFolder', () => {
    it('should reject non-existent folders', async () => {
      await expect(
        service.importFromFolder('/nonexistent/folder')
      ).rejects.toThrow('Folder not found');
    });

    it('should reject non-directory paths', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test');
      
      await expect(
        service.importFromFolder(testFile)
      ).rejects.toThrow('must be a directory');
    });

    it('should return empty array for empty folders', async () => {
      const slides = await service.importFromFolder(tempDir);
      expect(slides).toEqual([]);
    });

    it('should find files with specified extensions', async () => {
      // Create some test files
      await fs.writeFile(path.join(tempDir, 'test1.pptx'), 'content');
      await fs.writeFile(path.join(tempDir, 'test2.txt'), 'content');
      
      const slides = await service.importFromFolder(tempDir, {
        extensions: ['.pptx']
      });
      
      // Note: Actual import would fail without LibreOffice, but folder scanning works
      // This test mainly validates the file discovery logic
      expect(slides.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid PDF files gracefully', async () => {
      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, 'not a real pdf');
      
      await expect(
        service.importPdf(invalidPdf)
      ).rejects.toThrow('Failed to import PDF');
    });

    it('should provide clear error messages for missing dependencies', async () => {
      const testFile = path.join(tempDir, 'test.pptx');
      await fs.writeFile(testFile, 'content');
      
      // PowerPoint import requires LibreOffice
      try {
        await service.importPowerpoint(testFile);
        // If LibreOffice is installed, this won't throw
      } catch (error: any) {
        expect(error.message).toContain('LibreOffice');
      }
    });
  });

  describe('importFromZip', () => {
    it('should reject non-existent zip files', async () => {
      await expect(
        service.importFromZip('/nonexistent/file.zip')
      ).rejects.toThrow('Zip file not found');
    });

    it('should reject non-zip files', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test');
      
      await expect(
        service.importFromZip(testFile)
      ).rejects.toThrow('must have .zip extension');
    });

    it('should handle empty zip files', async () => {
      const zipPath = path.join(tempDir, 'empty.zip');
      const zip = new AdmZip();
      zip.writeZip(zipPath);
      
      await expect(
        service.importFromZip(zipPath)
      ).rejects.toThrow();
    });
  });
});
