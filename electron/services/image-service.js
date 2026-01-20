const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

/**
 * Image Service
 * Handles image operations including loading, caching, format conversion,
 * thumbnail generation, and display coordination.
 */

// Get cache directory for image operations
function getCacheDir() {
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache', 'images');
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

/**
 * Supported image formats
 */
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];

/**
 * Check if file is a supported image
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if supported image format
 */
function isSupportedImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Get image metadata
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Image metadata including dimensions, format, size
 */
async function getImageMetadata(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      size: stats.size,
      path: imagePath
    };
  } catch (err) {
    throw new Error(`Failed to get image metadata: ${err.message}`);
  }
}

/**
 * Generate image thumbnail
 * @param {string} imagePath - Path to the image file
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height (optional, maintains aspect ratio if not provided)
 * @returns {Promise<string>} Path to generated thumbnail
 */
async function generateThumbnail(imagePath, width = 320, height = null) {
  try {
    const cacheDir = getCacheDir();
    const thumbnailName = `thumb_${uuidv4()}.jpg`;
    const thumbnailPath = path.join(cacheDir, thumbnailName);
    
    const resizeOptions = { width };
    if (height) {
      resizeOptions.height = height;
      resizeOptions.fit = 'cover';
    }
    
    await sharp(imagePath)
      .resize(resizeOptions)
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    console.log(`Thumbnail generated: ${thumbnailPath}`);
    return thumbnailPath;
  } catch (err) {
    throw new Error(`Failed to generate thumbnail: ${err.message}`);
  }
}

/**
 * Convert image to specific format
 * @param {string} inputPath - Path to input image
 * @param {string} format - Target format ('jpeg', 'png', 'webp', etc.)
 * @param {Object} options - Format-specific options
 * @returns {Promise<string>} Path to converted image
 */
async function convertFormat(inputPath, format, options = {}) {
  try {
    const cacheDir = getCacheDir();
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(cacheDir, `${fileName}_converted.${format}`);
    
    let pipeline = sharp(inputPath);
    
    // Apply format-specific options
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality: options.quality || 90,
          progressive: options.progressive !== false
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: options.compressionLevel || 6,
          progressive: options.progressive !== false
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: options.quality || 80,
          lossless: options.lossless || false
        });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({
          quality: options.quality || 80
        });
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    await pipeline.toFile(outputPath);
    console.log(`Image converted to ${format}: ${outputPath}`);
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to convert image format: ${err.message}`);
  }
}

/**
 * Resize image
 * @param {string} imagePath - Path to the image file
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @param {Object} options - Resize options (fit, position, background, etc.)
 * @returns {Promise<string>} Path to resized image
 */
async function resizeImage(imagePath, width, height, options = {}) {
  try {
    const cacheDir = getCacheDir();
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const ext = path.extname(imagePath);
    const outputPath = path.join(cacheDir, `${fileName}_${width}x${height}${ext}`);
    
    await sharp(imagePath)
      .resize({
        width,
        height,
        fit: options.fit || 'contain',
        position: options.position || 'center',
        background: options.background || { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(outputPath);
    
    console.log(`Image resized: ${outputPath}`);
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to resize image: ${err.message}`);
  }
}

/**
 * Optimize image for web display
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} Path to optimized image
 */
async function optimizeForWeb(imagePath) {
  try {
    const cacheDir = getCacheDir();
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(cacheDir, `${fileName}_optimized.jpg`);
    
    await sharp(imagePath)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);
    
    console.log(`Image optimized for web: ${outputPath}`);
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to optimize image: ${err.message}`);
  }
}

/**
 * Create image with text overlay
 * @param {string} imagePath - Path to the background image
 * @param {string} text - Text to overlay
 * @param {Object} options - Text styling options
 * @returns {Promise<string>} Path to image with text overlay
 */
async function addTextOverlay(imagePath, text, options = {}) {
  try {
    const cacheDir = getCacheDir();
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(cacheDir, `${fileName}_text_overlay.png`);
    
    // Create SVG with text
    const textSvg = `
      <svg width="1920" height="200">
        <text
          x="50%"
          y="50%"
          text-anchor="middle"
          font-family="${options.fontFamily || 'Arial'}"
          font-size="${options.fontSize || 48}"
          fill="${options.color || 'white'}"
          stroke="${options.stroke || 'black'}"
          stroke-width="${options.strokeWidth || 2}"
        >
          ${text}
        </text>
      </svg>
    `;
    
    const textBuffer = Buffer.from(textSvg);
    
    await sharp(imagePath)
      .composite([
        {
          input: textBuffer,
          top: options.top || 0,
          left: options.left || 0
        }
      ])
      .toFile(outputPath);
    
    console.log(`Text overlay added: ${outputPath}`);
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to add text overlay: ${err.message}`);
  }
}

/**
 * Load and cache image
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Cached image info
 */
async function loadAndCache(imagePath) {
  try {
    const cacheDir = getCacheDir();
    const fileName = path.basename(imagePath);
    const cachedPath = path.join(cacheDir, fileName);
    
    // Check if already cached
    if (await fs.pathExists(cachedPath)) {
      console.log(`Image already cached: ${cachedPath}`);
      return {
        path: cachedPath,
        cached: true
      };
    }
    
    // Copy to cache
    await fs.copy(imagePath, cachedPath);
    console.log(`Image cached: ${cachedPath}`);
    
    return {
      path: cachedPath,
      cached: false
    };
  } catch (err) {
    throw new Error(`Failed to load and cache image: ${err.message}`);
  }
}

/**
 * Clear image cache
 * @param {number} olderThanDays - Clear images older than specified days (default: 7)
 * @returns {Promise<number>} Number of files deleted
 */
async function clearCache(olderThanDays = 7) {
  try {
    const cacheDir = getCacheDir();
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
    
    console.log(`Cleared ${deletedCount} cached images`);
    return deletedCount;
  } catch (err) {
    throw new Error(`Failed to clear cache: ${err.message}`);
  }
}

/**
 * Extract dominant color from image
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Dominant color as RGB object
 */
async function getDominantColor(imagePath) {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(100, 100, { fit: 'cover' })
      .ensureAlpha() // Ensure consistent channel count
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Calculate average color, handling different channel counts
    let r = 0, g = 0, b = 0;
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
      b: Math.round(b / pixelCount)
    };
  } catch (err) {
    throw new Error(`Failed to get dominant color: ${err.message}`);
  }
}

module.exports = {
  isSupportedImage,
  getImageMetadata,
  generateThumbnail,
  convertFormat,
  resizeImage,
  optimizeForWeb,
  addTextOverlay,
  loadAndCache,
  clearCache,
  getDominantColor,
  SUPPORTED_FORMATS
};
