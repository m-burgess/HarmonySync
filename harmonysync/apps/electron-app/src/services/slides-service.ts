/**
 * Slides Service (In-Process - Coordination and Management)
 * 
 * This service runs IN-PROCESS as it primarily coordinates with other services
 * and manages slide metadata. It delegates CPU-intensive operations to other services:
 * 
 * - PDF rendering -> harmonysync-image-service
 * - PowerPoint conversion -> LibreOffice + harmonysync-image-service
 * - Image optimization -> harmonysync-image-service
 * 
 * This service handles:
 * - Slide import coordination
 * - Metadata management
 * - Text slide creation (lightweight HTML generation)
 * - File system operations (zip extraction, folder scanning)
 * - Parsing service metadata from folder structures
 * 
 * Keeps main app responsive by delegating heavy image processing to separate services.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';
import * as sharp from 'sharp';
import * as AdmZip from 'adm-zip';
import { spawnSync } from 'child_process';
import { BaseElectronService, ISlidesService, ServiceConfig } from '../types/services';

/**
 * Progress callback type
 */
interface ProgressInfo {
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Import options
 */
interface ImportOptions {
  dpi?: number;
  format?: 'png' | 'jpeg';
  outputDir?: string | null;
  extensions?: string[];
  recursive?: boolean;
  deleteZip?: boolean;
  extractDir?: string | null;
  importSlidesOnly?: boolean;
}

/**
 * Slide object structure
 */
interface SlideObject {
  type: 'image' | 'text' | 'video' | 'html';
  path?: string;
  content?: string;
  pageNumber?: number;
  title: string;
  source: string;
  sourcePath?: string;
  width: number;
  height: number;
  format?: string;
  style?: SlideStyle;
  backgroundImage?: string | null;
}

/**
 * Text slide style options
 */
interface SlideStyle {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: string;
}

/**
 * Slide file validation result
 */
interface ValidationResult {
  valid: boolean;
  type: string | null;
  message: string;
  pageCount?: number;
  size?: number;
}

/**
 * Slide metadata
 */
interface SlideMetadata {
  filename: string;
  basename: string;
  extension: string;
  size: number;
  created: Date;
  modified: Date;
  path: string;
  pageCount?: number;
  type?: string;
  title?: string;
  author?: string;
  subject?: string;
  error?: string;
}

/**
 * Zip import result
 */
interface ZipImportResult {
  extractedPath: string;
  slides: SlideObject[];
  slideCount: number;
  zipDeleted: boolean;
  servicePath: string;
}

/**
 * Service folder structure
 */
interface ServiceStructure {
  path: string;
  name: string;
  songs: ServiceSong[];
  videos: ServiceFile[];
  images: ServiceFile[];
  slides: ServiceFile[];
  otherFiles: ServiceFile[];
}

/**
 * Service song structure
 */
interface ServiceSong {
  id: string;
  path: string;
  name: string;
  type: 'song';
  tracks: SongTrack[];
  lyrics: string;
  loaded: boolean;
}

/**
 * Song track structure
 */
interface SongTrack {
  file_path: string;
  track_name: string;
}

/**
 * Service file structure
 */
interface ServiceFile {
  name: string;
  path: string;
  type: string;
}

/**
 * Slides Service Implementation
 * Provides comprehensive slide import and management capabilities
 */
export class SlidesService extends BaseElectronService implements ISlidesService {
  protected readonly serviceName = 'SlidesService';

  private readonly DEFAULT_DPI = 150;
  private readonly DEFAULT_FORMAT = 'png';
  private readonly DEFAULT_WIDTH = 1920;
  private readonly DEFAULT_HEIGHT = 1080;

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the slides service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Slides service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Slides service disposed');
  }

  /**
   * Import slides from a file (PDF or PowerPoint)
   * @param filePath - Path to the file
   * @param options - Import options
   * @param progressCallback - Optional progress callback
   * @returns Array of slide objects
   */
  public async import(
    filePath: string,
    options: ImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<string[]> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let slides: SlideObject[];

      if (ext === '.pdf') {
        slides = await this.importPdf(filePath, options, progressCallback);
      } else if (['.pptx', '.ppt'].includes(ext)) {
        slides = await this.importPowerpoint(filePath, options, progressCallback);
      } else if (ext === '.zip') {
        const result = await this.importFromZip(filePath, options, progressCallback);
        slides = result.slides;
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      return slides.map(slide => slide.path || '');
    } catch (error) {
      this.handleError('import', error);
    }
  }

  /**
   * Export slides (placeholder for future implementation)
   */
  public async export(_slides: any[], _outputPath: string): Promise<void> {
    throw new Error('Export not yet implemented');
  }

  /**
   * Get all slides (placeholder for future implementation)
   */
  public async getAll(): Promise<any[]> {
    throw new Error('getAll not yet implemented');
  }

  /**
   * Create a slide (placeholder for future implementation)
   */
  public async create(_slide: any): Promise<string> {
    throw new Error('create not yet implemented');
  }

  /**
   * Update a slide (placeholder for future implementation)
   */
  public async update(_id: string, _slide: any): Promise<void> {
    throw new Error('update not yet implemented');
  }

  /**
   * Delete a slide (placeholder for future implementation)
   */
  public async delete(_id: string): Promise<void> {
    throw new Error('delete not yet implemented');
  }

  /**
   * Import slides from a PDF file
   */
  public async importPdf(
    pdfPath: string,
    options: ImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<SlideObject[]> {
    const { dpi = this.DEFAULT_DPI, format = this.DEFAULT_FORMAT, outputDir = null } = options;

    try {
      // Validate PDF file exists
      if (!(await fs.pathExists(pdfPath))) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Validate file extension
      if (!pdfPath.toLowerCase().endsWith('.pdf')) {
        throw new Error('File must have .pdf extension');
      }

      // Create output directory
      const tempDir =
        outputDir || path.join(os.tmpdir(), 'harmonysync-slides', Date.now().toString());
      await fs.ensureDir(tempDir);

      // Load PDF to get page count
      const pdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      // Configure pdf2pic
      const options2pic = {
        density: dpi,
        saveFilename: 'slide',
        savePath: tempDir,
        format: format,
        width: this.DEFAULT_WIDTH,
        height: this.DEFAULT_HEIGHT,
      };

      const convert = fromPath(pdfPath, options2pic);
      const slides: SlideObject[] = [];

      // Convert each page to image
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        if (progressCallback) {
          progressCallback({
            current: pageNum,
            total: pageCount,
            message: `Converting page ${pageNum} of ${pageCount}`,
          });
        }

        const result = await convert(pageNum, { responseType: 'image' });

        // Optimize image with sharp
        const optimizedPath = path.join(tempDir, `slide-${pageNum}.${format}`);
        const imagePath = result.path || '';
        await (sharp as any)(imagePath)
          .resize(this.DEFAULT_WIDTH, this.DEFAULT_HEIGHT, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 },
          })
          .toFile(optimizedPath);

        // Clean up original if different
        if (imagePath && imagePath !== optimizedPath) {
          await fs.remove(imagePath).catch(() => {});
        }

        slides.push({
          type: 'image',
          path: optimizedPath,
          pageNumber: pageNum,
          title: `Slide ${pageNum}`,
          source: 'pdf',
          sourcePath: pdfPath,
          width: this.DEFAULT_WIDTH,
          height: this.DEFAULT_HEIGHT,
          format: format,
        });
      }

      this.log('info', `Imported ${slides.length} slides from PDF`);
      return slides;
    } catch (error) {
      this.handleError('importPdf', error);
    }
  }

  /**
   * Import slides from a PowerPoint file
   */
  public async importPowerpoint(
    pptxPath: string,
    options: ImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<SlideObject[]> {
    try {
      // Validate PowerPoint file exists
      if (!(await fs.pathExists(pptxPath))) {
        throw new Error(`PowerPoint file not found: ${pptxPath}`);
      }

      // Validate file extension
      const ext = path.extname(pptxPath).toLowerCase();
      if (!['.pptx', '.ppt'].includes(ext)) {
        throw new Error('File must have .pptx or .ppt extension');
      }

      // Check if LibreOffice is available
      if (!this.isLibreOfficeAvailable()) {
        throw new Error(
          'LibreOffice is required for PowerPoint import. Please install LibreOffice.'
        );
      }

      // Create temp directory for PDF conversion
      const tempDir = path.join(os.tmpdir(), 'harmonysync-pptx', Date.now().toString());
      await fs.ensureDir(tempDir);

      // Convert PPTX to PDF using LibreOffice
      if (progressCallback) {
        progressCallback({ current: 0, total: 100, message: 'Converting PowerPoint to PDF...' });
      }

      const convertedPdfPath = await this.convertPptxToPdf(pptxPath, tempDir);

      if (progressCallback) {
        progressCallback({ current: 50, total: 100, message: 'Converting PDF to images...' });
      }

      // Import the PDF
      const slides = await this.importPdf(
        convertedPdfPath,
        {
          ...options,
          outputDir: options.outputDir || tempDir,
        },
        progressCallback
          ? (progress) => {
              const overallProgress = 50 + Math.floor((progress.current / progress.total) * 50);
              progressCallback({
                current: overallProgress,
                total: 100,
                message: `Processing slide ${progress.current} of ${progress.total}`,
              });
            }
          : undefined
      );

      // Update metadata to reflect PowerPoint source
      slides.forEach((slide) => {
        slide.source = 'powerpoint';
        slide.sourcePath = pptxPath;
      });

      // Clean up converted PDF
      await fs.remove(convertedPdfPath).catch(() => {});

      this.log('info', `Imported ${slides.length} slides from PowerPoint`);
      return slides;
    } catch (error) {
      this.handleError('importPowerpoint', error);
    }
  }

  /**
   * Create a text slide
   */
  public async createTextSlide(
    text: string,
    style: SlideStyle = {},
    backgroundImage: string | null = null
  ): Promise<SlideObject> {
    const {
      fontSize = '48px',
      fontFamily = 'Arial, sans-serif',
      color = '#FFFFFF',
      backgroundColor = '#000000',
      textAlign = 'center',
    } = style;

    try {
      // Validate background image if provided
      if (backgroundImage && !(await fs.pathExists(backgroundImage))) {
        throw new Error(`Background image not found: ${backgroundImage}`);
      }

      // Create slide object (HTML-based)
      const slide: SlideObject = {
        type: 'text',
        content: text,
        style: {
          fontSize,
          fontFamily,
          color,
          backgroundColor,
          textAlign,
        },
        backgroundImage: backgroundImage,
        source: 'custom',
        title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        width: this.DEFAULT_WIDTH,
        height: this.DEFAULT_HEIGHT,
      };

      return slide;
    } catch (error) {
      this.handleError('createTextSlide', error);
    }
  }

  /**
   * Import slides from a folder
   */
  public async importFromFolder(
    folderPath: string,
    options: ImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<SlideObject[]> {
    const { extensions = ['.pdf', '.pptx', '.ppt'], recursive = false } = options;

    try {
      // Validate folder exists
      if (!(await fs.pathExists(folderPath))) {
        throw new Error(`Folder not found: ${folderPath}`);
      }

      const stat = await fs.stat(folderPath);
      if (!stat.isDirectory()) {
        throw new Error('Path must be a directory');
      }

      // Find all matching files
      const files = await this.scanDirectoryForFiles(folderPath, extensions, recursive);

      if (files.length === 0) {
        return [];
      }

      // Import all files
      const allSlides: SlideObject[] = [];

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const ext = path.extname(filePath).toLowerCase();

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: files.length,
            message: `Importing ${path.basename(filePath)}...`,
          });
        }

        try {
          let slides: SlideObject[];
          if (ext === '.pdf') {
            slides = await this.importPdf(filePath, options);
          } else if (['.pptx', '.ppt'].includes(ext)) {
            slides = await this.importPowerpoint(filePath, options);
          } else {
            continue;
          }

          allSlides.push(...slides);
        } catch (error) {
          this.log('error', `Failed to import ${filePath}:`, error);
          // Continue with other files
        }
      }

      this.log('info', `Imported ${allSlides.length} slides from folder`);
      return allSlides;
    } catch (error) {
      this.handleError('importFromFolder', error);
    }
  }

  /**
   * Import slides from a zipped folder
   */
  public async importFromZip(
    zipPath: string,
    options: ImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<ZipImportResult> {
    const {
      dpi = this.DEFAULT_DPI,
      format = this.DEFAULT_FORMAT,
      deleteZip = false,
      extractDir = null,
      importSlidesOnly = false,
    } = options;

    try {
      // Validate zip file exists
      if (!(await fs.pathExists(zipPath))) {
        throw new Error(`Zip file not found: ${zipPath}`);
      }

      // Validate file extension
      const ext = path.extname(zipPath).toLowerCase();
      if (ext !== '.zip') {
        throw new Error('File must have .zip extension');
      }

      if (progressCallback) {
        progressCallback({
          current: 0,
          total: 100,
          message: 'Extracting zip file...',
        });
      }

      // Determine extraction directory
      const baseDir = extractDir || path.join(app.getPath('userData'), 'Service Order');
      await fs.ensureDir(baseDir);

      const zipBaseName = path.basename(zipPath, '.zip');
      let extractPath = path.join(baseDir, zipBaseName);

      // Check if extraction directory already exists
      if (await fs.pathExists(extractPath)) {
        const timestamp = Date.now();
        extractPath = path.join(baseDir, `${zipBaseName}_${timestamp}`);

        if (progressCallback) {
          progressCallback({
            current: 10,
            total: 100,
            message: `Folder exists, using ${path.basename(extractPath)}...`,
          });
        }
      }

      // Extract zip file
      await this.extractZipFile(zipPath, extractPath);

      if (progressCallback) {
        progressCallback({
          current: 30,
          total: 100,
          message: importSlidesOnly ? 'Zip extracted, importing slides...' : 'Service extracted successfully!',
        });
      }

      let slides: SlideObject[] = [];

      // Only import slides if requested
      if (importSlidesOnly) {
        slides = await this.importFromFolder(
          extractPath,
          {
            dpi,
            format,
            recursive: true,
          },
          progressCallback
            ? (progress) => {
                const overallProgress = 30 + Math.floor((progress.current / progress.total) * 60);
                progressCallback({
                  current: overallProgress,
                  total: 100,
                  message: progress.message,
                });
              }
            : undefined
        );
      }

      // Clean up zip file if requested
      if (deleteZip) {
        if (progressCallback) {
          progressCallback({
            current: 95,
            total: 100,
            message: 'Cleaning up...',
          });
        }
        await fs.remove(zipPath);
      }

      if (progressCallback) {
        progressCallback({
          current: 100,
          total: 100,
          message: importSlidesOnly ? 'Import complete!' : 'Service ready to load!',
        });
      }

      return {
        extractedPath: extractPath,
        slides: slides,
        slideCount: slides.length,
        zipDeleted: deleteZip,
        servicePath: extractPath,
      };
    } catch (error) {
      this.handleError('importFromZip', error);
    }
  }

  /**
   * Scan an extracted service folder and return its structure
   */
  public async scanServiceFolder(servicePath: string): Promise<ServiceStructure> {
    try {
      const serviceStructure: ServiceStructure = {
        path: servicePath,
        name: path.basename(servicePath),
        songs: [],
        videos: [],
        images: [],
        slides: [],
        otherFiles: [],
      };

      // Read all entries in the service folder
      const entries = await fs.readdir(servicePath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(servicePath, entry.name);

        if (entry.isDirectory()) {
          // Check if this is a song folder (contains 'ogg' subfolder)
          const oggDir = path.join(fullPath, 'ogg');
          const oggExists = await fs.pathExists(oggDir);

          if (oggExists) {
            try {
              const song = await this.parseSongFolder(fullPath, entry.name);
              serviceStructure.songs.push(song);
            } catch (error) {
              this.log('warn', `Failed to read song folder: ${fullPath}`, error);
            }
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          // Categorize files
          if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
            serviceStructure.videos.push({
              name: entry.name,
              path: fullPath,
              type: 'video',
            });
          } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
            serviceStructure.images.push({
              name: entry.name,
              path: fullPath,
              type: 'image',
            });
          } else if (['.pdf', '.pptx', '.ppt'].includes(ext)) {
            serviceStructure.slides.push({
              name: entry.name,
              path: fullPath,
              type: 'slide-file',
            });
          } else if (ext === '.txt' && entry.name !== 'lyrics.txt') {
            serviceStructure.otherFiles.push({
              name: entry.name,
              path: fullPath,
              type: 'text',
            });
          }
        }
      }

      return serviceStructure;
    } catch (error) {
      this.handleError('scanServiceFolder', error);
    }
  }

  /**
   * Validate a slide file
   */
  public async validateSlideFile(filePath: string): Promise<ValidationResult> {
    try {
      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        return {
          valid: false,
          type: null,
          message: 'File does not exist',
        };
      }

      // Check if it's a file
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return {
          valid: false,
          type: null,
          message: 'Path is not a file',
        };
      }

      // Get file extension
      const ext = path.extname(filePath).toLowerCase();

      // Validate based on extension
      if (ext === '.pdf') {
        try {
          const pdfBytes = await fs.readFile(filePath);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pageCount = pdfDoc.getPageCount();

          return {
            valid: true,
            type: 'pdf',
            message: `Valid PDF with ${pageCount} page${pageCount !== 1 ? 's' : ''}`,
            pageCount,
          };
        } catch (error) {
          return {
            valid: false,
            type: 'pdf',
            message: `Invalid PDF file: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      } else if (['.pptx', '.ppt'].includes(ext)) {
        const size = stat.size;
        if (size === 0) {
          return {
            valid: false,
            type: 'powerpoint',
            message: 'PowerPoint file is empty',
          };
        }

        return {
          valid: true,
          type: 'powerpoint',
          message: 'Valid PowerPoint file',
          size,
        };
      } else {
        return {
          valid: false,
          type: null,
          message: `Unsupported file type: ${ext}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        type: null,
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get metadata from a slide file
   */
  public async getSlideMetadata(filePath: string): Promise<SlideMetadata> {
    try {
      if (!(await fs.pathExists(filePath))) {
        throw new Error('File does not exist');
      }

      const stat = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const basename = path.basename(filePath, ext);

      const metadata: SlideMetadata = {
        filename: path.basename(filePath),
        basename,
        extension: ext,
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
        path: filePath,
      };

      // Get additional metadata based on type
      if (ext === '.pdf') {
        try {
          const pdfBytes = await fs.readFile(filePath);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          metadata.pageCount = pdfDoc.getPageCount();
          metadata.type = 'pdf';

          // Get PDF metadata
          const title = pdfDoc.getTitle();
          const author = pdfDoc.getAuthor();
          const subject = pdfDoc.getSubject();

          if (title) metadata.title = title;
          if (author) metadata.author = author;
          if (subject) metadata.subject = subject;
        } catch (error) {
          metadata.error = `Failed to read PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
        }
      } else if (['.pptx', '.ppt'].includes(ext)) {
        metadata.type = 'powerpoint';
      }

      return metadata;
    } catch (error) {
      this.handleError('getSlideMetadata', error);
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Check if LibreOffice is available
   */
  private isLibreOfficeAvailable(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('which libreoffice || which soffice', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert PPTX to PDF using LibreOffice
   */
  private async convertPptxToPdf(pptxPath: string, outputDir: string): Promise<string> {
    try {
      // Try libreoffice first
      let result = spawnSync(
        'libreoffice',
        ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, pptxPath],
        { timeout: 60000 }
      );

      // Try soffice if libreoffice fails
      if (result.error) {
        result = spawnSync(
          'soffice',
          ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, pptxPath],
          { timeout: 60000 }
        );
      }

      if (result.error) {
        throw result.error;
      }

      // Find the generated PDF
      const files = await fs.readdir(outputDir);
      const pdfFile = files.find((f) => f.endsWith('.pdf'));

      if (!pdfFile) {
        throw new Error('PowerPoint to PDF conversion failed');
      }

      return path.join(outputDir, pdfFile);
    } catch (error) {
      throw new Error(
        `PowerPoint conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract a zip file to a directory
   */
  private async extractZipFile(zipPath: string, extractPath: string): Promise<void> {
    try {
      // Create extraction directory
      await fs.ensureDir(extractPath);

      // Extract zip file
      const zip = new (AdmZip as any)(zipPath);
      zip.extractAllTo(extractPath, true);

      // Verify extraction
      const files = await fs.readdir(extractPath);
      if (files.length === 0) {
        throw new Error('Zip file appears to be empty');
      }
    } catch (error) {
      throw new Error(`Failed to extract zip: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Scan directory for files with specific extensions
   */
  private async scanDirectoryForFiles(
    dirPath: string,
    extensions: string[],
    recursive: boolean
  ): Promise<string[]> {
    const files: string[] = [];

    const scanDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    await scanDir(dirPath);
    return files;
  }

  /**
   * Parse song folder structure
   */
  private async parseSongFolder(folderPath: string, folderName: string): Promise<ServiceSong> {
    const oggDir = path.join(folderPath, 'ogg');
    const oggFiles = await fs.readdir(oggDir);
    const tracks: SongTrack[] = oggFiles
      .filter((f) => f.endsWith('.ogg'))
      .sort()
      .map((f) => ({
        file_path: path.join(oggDir, f),
        track_name: f,
      }));

    // Check for lyrics.txt
    let lyrics = '';
    const lyricsPath = path.join(folderPath, 'lyrics.txt');
    if (await fs.pathExists(lyricsPath)) {
      lyrics = await fs.readFile(lyricsPath, 'utf-8');
    }

    return {
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: folderPath,
      name: folderName,
      type: 'song',
      tracks,
      lyrics,
      loaded: false,
    };
  }
}

// Export singleton instance
let slidesServiceInstance: SlidesService | null = null;

/**
 * Get or create the slides service singleton
 */
export function getSlidesService(config?: ServiceConfig): SlidesService {
  if (!slidesServiceInstance) {
    slidesServiceInstance = new SlidesService(config);
  }
  return slidesServiceInstance;
}

// Export for backward compatibility
export default SlidesService;
