/**
 * Image Service
 * Handles image operations including loading, caching, format conversion,
 * thumbnail generation, resizing, optimization, and text overlays.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { BaseElectronService, IImageService, ServiceConfig } from '@harmonysync/core';
import { ImageMetadata } from '@harmonysync/core';

/**
 * Supported image formats
 */
export const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];

/**
 * Image resize options
 */
interface ResizeOptions {
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: { r: number; g: number; b: number; alpha: number };
}

/**
 * Format conversion options
 */
interface FormatConversionOptions {
  quality?: number;
  progressive?: boolean;
  compressionLevel?: number;
  lossless?: boolean;
}

/**
 * Text overlay options
 */
interface TextOverlayOptions {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  top?: number;
  left?: number;
}

/**
 * Extended image metadata
 */
interface ExtendedImageMetadata extends ImageMetadata {
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  path: string;
}

/**
 * Cached image info
 */
interface CachedImageInfo {
  path: string;
  cached: boolean;
}

/**
 * RGB color object
 */
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Image Service Implementation
 * Provides comprehensive image processing capabilities with Sharp
 */
export class ImageService extends BaseElectronService implements IImageService {
  protected readonly serviceName = 'ImageService';

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the image service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Image service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Image service disposed');
  }

  /**
   * Check if file is a supported image
   * @param filePath - Path to the file
   * @returns True if supported image format
   */
  public isSupportedImage(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_FORMATS.includes(ext);
  }

  /**
   * Get image metadata
   * @param imagePath - Path to the image file
   * @returns Image metadata including dimensions, format, size
   */
  public async getImageMetadata(imagePath: string): Promise<ExtendedImageMetadata> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        size: stats.size,
        path: imagePath,
      };
    } catch (error) {
      this.handleError('getImageMetadata', error);
    }
  }

  /**
   * Generate image thumbnail
   * @param imagePath - Path to the image file
   * @param size - Optional size object with width and height
   * @returns Path to generated thumbnail
   */
  public async generateThumbnail(
    imagePath: string,
    size?: { width: number; height: number }
  ): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const thumbnailName = `thumb_${uuidv4()}.jpg`;
      const thumbnailPath = path.join(cacheDir, thumbnailName);

      const width = size?.width || 320;
      const height = size?.height;

      const resizeOptions: any = { width };
      if (height) {
        resizeOptions.height = height;
        resizeOptions.fit = 'cover';
      }

      await sharp(imagePath).resize(resizeOptions).jpeg({ quality: 80 }).toFile(thumbnailPath);

      this.log('info', `Thumbnail generated: ${thumbnailPath}`);
      return thumbnailPath;
    } catch (error) {
      this.handleError('generateThumbnail', error);
    }
  }

  /**
   * Convert image to specific format
   * @param inputPath - Path to input image
   * @param format - Target format ('jpeg', 'png', 'webp', etc.)
   * @param options - Format-specific options
   * @returns Path to converted image
   */
  public async convertFormat(
    inputPath: string,
    format: string,
    options: FormatConversionOptions = {}
  ): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(cacheDir, `${fileName}_converted.${format}`);

      let pipeline = sharp(inputPath);

      // Apply format-specific options
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality: options.quality || 90,
            progressive: options.progressive !== false,
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            compressionLevel: options.compressionLevel || 6,
            progressive: options.progressive !== false,
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality: options.quality || 80,
            lossless: options.lossless || false,
          });
          break;
        case 'tiff':
          pipeline = pipeline.tiff({
            quality: options.quality || 80,
          });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      await pipeline.toFile(outputPath);
      this.log('info', `Image converted to ${format}: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.handleError('convertFormat', error);
    }
  }

  /**
   * Resize image
   * @param imagePath - Path to the image file
   * @param width - Target width
   * @param height - Target height
   * @param options - Resize options (fit, position, background, etc.)
   * @returns Path to resized image
   */
  public async resizeImage(
    imagePath: string,
    width: number,
    height: number,
    options: ResizeOptions = {}
  ): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(imagePath, path.extname(imagePath));
      const ext = path.extname(imagePath);
      const outputPath = path.join(cacheDir, `${fileName}_${width}x${height}${ext}`);

      await sharp(imagePath)
        .resize({
          width,
          height,
          fit: options.fit || 'contain',
          position: options.position || 'center',
          background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toFile(outputPath);

      this.log('info', `Image resized: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.handleError('resizeImage', error);
    }
  }

  /**
   * Optimize image for web display
   * @param imagePath - Path to the image file
   * @returns Path to optimized image
   */
  public async optimizeForWeb(imagePath: string): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(cacheDir, `${fileName}_optimized.jpg`);

      await sharp(imagePath)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      this.log('info', `Image optimized for web: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.handleError('optimizeForWeb', error);
    }
  }

  /**
   * Create image with text overlay
   * @param imagePath - Path to the background image
   * @param text - Text to overlay
   * @param options - Text styling options
   * @returns Path to image with text overlay
   */
  public async addTextOverlay(
    imagePath: string,
    text: string,
    options?: TextOverlayOptions
  ): Promise<string> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(cacheDir, `${fileName}_text_overlay.png`);

      // XML-escape text to prevent injection
      const escapedText = this.escapeXml(text);

      // Create SVG with text
      const textSvg = `
      <svg width="1920" height="200">
        <text
          x="50%"
          y="50%"
          text-anchor="middle"
          font-family="${options?.fontFamily || 'Arial'}"
          font-size="${options?.fontSize || 48}"
          fill="${options?.color || 'white'}"
          stroke="${options?.stroke || 'black'}"
          stroke-width="${options?.strokeWidth || 2}"
        >
          ${escapedText}
        </text>
      </svg>
    `;

      const textBuffer = Buffer.from(textSvg);

      await sharp(imagePath)
        .composite([
          {
            input: textBuffer,
            top: options?.top || 0,
            left: options?.left || 0,
          },
        ])
        .toFile(outputPath);

      this.log('info', `Text overlay added: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.handleError('addTextOverlay', error);
    }
  }

  /**
   * Load and cache image
   * @param imagePath - Path to the image file
   * @returns Cached image info
   */
  public async loadAndCache(imagePath: string): Promise<CachedImageInfo> {
    try {
      const cacheDir = this.getCacheDir();
      const fileName = path.basename(imagePath);
      const cachedPath = path.join(cacheDir, fileName);

      // Check if already cached
      if (await fs.pathExists(cachedPath)) {
        this.log('debug', `Image already cached: ${cachedPath}`);
        return {
          path: cachedPath,
          cached: true,
        };
      }

      // Copy to cache
      await fs.copy(imagePath, cachedPath);
      this.log('info', `Image cached: ${cachedPath}`);

      return {
        path: cachedPath,
        cached: false,
      };
    } catch (error) {
      this.handleError('loadAndCache', error);
    }
  }

  /**
   * Clear image cache
   * @param olderThanDays - Clear images older than specified days (default: 7)
   * @returns Promise that resolves when cache is cleared
   */
  public async clearCache(olderThanDays: number = 7): Promise<void> {
    try {
      const cacheDir = this.getCacheDir();
      const files = await fs.readdir(cacheDir);
      const now = Date.now();
      const threshold = olderThanDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(cacheDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > threshold) {
          await fs.remove(filePath);
          deletedCount++;
        }
      }

      this.log('info', `Cleared ${deletedCount} cached images`);
    } catch (error) {
      this.handleError('clearCache', error);
    }
  }

  /**
   * Extract dominant color from image
   * @param imagePath - Path to the image file
   * @returns Dominant color as RGB object
   */
  public async getDominantColor(imagePath: string): Promise<RGBColor> {
    try {
      const { data, info } = await sharp(imagePath)
        .resize(100, 100, { fit: 'cover' })
        .ensureAlpha() // Ensure consistent channel count
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate average color, handling different channel counts
      let r = 0,
        g = 0,
        b = 0;
      const pixelCount = info.width * info.height;
      const channels = info.channels;

      for (let i = 0; i < data.length; i += channels) {
        r += data[i] || 0;
        g += data[i + 1] || 0;
        b += data[i + 2] || 0;
      }

      return {
        r: Math.round(r / pixelCount),
        g: Math.round(g / pixelCount),
        b: Math.round(b / pixelCount),
      };
    } catch (error) {
      this.handleError('getDominantColor', error);
    }
  }

  /**
   * Import PPTX file (placeholder - requires additional library)
   * @param _pptxPath - Path to PPTX file
   * @param _outputDir - Output directory
   * @returns Array of image paths
   */
  public async importPPTX(_pptxPath: string, _outputDir: string): Promise<string[]> {
    // This is a placeholder - actual implementation would require additional libraries
    // like officegen or libreoffice conversion
    this.log('warn', 'PPTX import not yet implemented');
    throw new Error('PPTX import not yet implemented');
  }

  /**
   * Import PDF file (placeholder - requires additional library)
   * @param _pdfPath - Path to PDF file
   * @param _outputDir - Output directory
   * @returns Array of image paths
   */
  public async importPDF(_pdfPath: string, _outputDir: string): Promise<string[]> {
    // This is a placeholder - actual implementation would require pdf-poppler or similar
    this.log('warn', 'PDF import not yet implemented');
    throw new Error('PDF import not yet implemented');
  }

  /**
   * Get cache directory for image operations
   * @returns Cache directory path
   */
  private getCacheDir(): string {
    const appData = app.getPath('userData');
    const cacheDir = path.join(appData, 'harmonysync', 'cache', 'images');
    fs.ensureDirSync(cacheDir);
    return cacheDir;
  }

  /**
   * Escape XML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export singleton instance
let imageServiceInstance: ImageService | null = null;

/**
 * Get or create the image service singleton
 */
export function getImageService(config?: ServiceConfig): ImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new ImageService(config);
  }
  return imageServiceInstance;
}

// Export for backward compatibility
export default ImageService;
