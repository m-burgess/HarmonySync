const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { fromPath } = require('pdf2pic');
const sharp = require('sharp');

/**
 * Slides Service
 * 
 * Handles slide import from various sources:
 * - PowerPoint (.pptx) files
 * - PDF documents
 * - Google Slides
 * - Text/Image slides
 * 
 * This service runs in-process for optimal performance and memory efficiency.
 */

/**
 * Import slides from a PDF file
 * 
 * @param {string} pdfPath - Path to the PDF file
 * @param {Object} options - Import options
 * @param {number} options.dpi - Resolution for image conversion (default: 150)
 * @param {string} options.format - Output format: 'png' or 'jpeg' (default: 'png')
 * @param {string} options.outputDir - Directory to save slide images (default: temp dir)
 * @param {Function} progressCallback - Callback for progress updates (page, total)
 * @returns {Promise<Array>} Array of slide objects with paths and metadata
 */
async function importPdf(pdfPath, options = {}, progressCallback = null) {
  const {
    dpi = 150,
    format = 'png',
    outputDir = null
  } = options;

  try {
    // Validate PDF file exists
    if (!await fs.pathExists(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Validate file extension
    if (!pdfPath.toLowerCase().endsWith('.pdf')) {
      throw new Error('File must have .pdf extension');
    }

    // Create output directory
    const tempDir = outputDir || path.join(require('os').tmpdir(), 'harmonysync-slides', Date.now().toString());
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
      width: 1920,
      height: 1080
    };

    const convert = fromPath(pdfPath, options2pic);
    const slides = [];

    // Convert each page to image
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      if (progressCallback) {
        progressCallback({ 
          current: pageNum, 
          total: pageCount, 
          message: `Converting page ${pageNum} of ${pageCount}` 
        });
      }

      const result = await convert(pageNum, { responseType: 'image' });
      
      // Optimize image with sharp
      const optimizedPath = path.join(tempDir, `slide-${pageNum}.${format}`);
      await sharp(result.path)
        .resize(1920, 1080, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .toFile(optimizedPath);

      // Clean up original if different
      if (result.path !== optimizedPath) {
        await fs.remove(result.path).catch(() => {});
      }

      slides.push({
        type: 'image',
        path: optimizedPath,
        pageNumber: pageNum,
        title: `Slide ${pageNum}`,
        source: 'pdf',
        sourcePath: pdfPath,
        width: 1920,
        height: 1080,
        format: format
      });
    }

    return slides;
  } catch (error) {
    throw new Error(`Failed to import PDF: ${error.message}`);
  }
}

/**
 * Import slides from a PowerPoint file
 * 
 * Note: PowerPoint import requires external tools like LibreOffice or unoconv
 * This implementation first converts PPTX to PDF, then uses PDF import
 * 
 * @param {string} pptxPath - Path to the PowerPoint file
 * @param {Object} options - Import options
 * @param {number} options.dpi - Resolution for image conversion (default: 150)
 * @param {string} options.format - Output format: 'png' or 'jpeg' (default: 'png')
 * @param {string} options.outputDir - Directory to save slide images
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Array>} Array of slide objects
 */
async function importPowerpoint(pptxPath, options = {}, progressCallback = null) {
  try {
    // Validate PowerPoint file exists
    if (!await fs.pathExists(pptxPath)) {
      throw new Error(`PowerPoint file not found: ${pptxPath}`);
    }

    // Validate file extension
    const ext = path.extname(pptxPath).toLowerCase();
    if (!['.pptx', '.ppt'].includes(ext)) {
      throw new Error('File must have .pptx or .ppt extension');
    }

    // Check if LibreOffice is available
    const { execSync } = require('child_process');
    try {
      execSync('which libreoffice || which soffice', { stdio: 'ignore' });
    } catch (e) {
      throw new Error('LibreOffice is required for PowerPoint import. Please install LibreOffice.');
    }

    // Create temp directory for PDF conversion
    const tempDir = path.join(require('os').tmpdir(), 'harmonysync-pptx', Date.now().toString());
    await fs.ensureDir(tempDir);

    // Convert PPTX to PDF using LibreOffice
    const pdfPath = path.join(tempDir, 'converted.pdf');
    
    if (progressCallback) {
      progressCallback({ current: 0, total: 100, message: 'Converting PowerPoint to PDF...' });
    }

    try {
      // Use array syntax to avoid command injection
      const { spawnSync } = require('child_process');
      let result = spawnSync('libreoffice', [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', tempDir,
        pptxPath
      ], { timeout: 60000 });
      
      // Try alternative command if first fails
      if (result.error) {
        result = spawnSync('soffice', [
          '--headless',
          '--convert-to', 'pdf',
          '--outdir', tempDir,
          pptxPath
        ], { timeout: 60000 });
      }
      
      if (result.error) {
        throw result.error;
      }
    } catch (e) {
      throw new Error(`PowerPoint conversion failed: ${e.message}`);
    }

    // Find the generated PDF
    const files = await fs.readdir(tempDir);
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    
    if (!pdfFile) {
      throw new Error('PowerPoint to PDF conversion failed');
    }

    const convertedPdfPath = path.join(tempDir, pdfFile);

    if (progressCallback) {
      progressCallback({ current: 50, total: 100, message: 'Converting PDF to images...' });
    }

    // Import the PDF
    const slides = await importPdf(convertedPdfPath, {
      ...options,
      outputDir: options.outputDir || tempDir
    }, (page, total) => {
      if (progressCallback) {
        const progress = 50 + Math.floor((page / total) * 50);
        progressCallback({ 
          current: progress, 
          total: 100, 
          message: `Processing slide ${page} of ${total}` 
        });
      }
    });

    // Update metadata to reflect PowerPoint source
    slides.forEach(slide => {
      slide.source = 'powerpoint';
      slide.sourcePath = pptxPath;
    });

    // Clean up converted PDF
    await fs.remove(convertedPdfPath).catch(() => {});

    return slides;
  } catch (error) {
    throw new Error(`Failed to import PowerPoint: ${error.message}`);
  }
}

/**
 * Create a text slide
 * 
 * @param {string} text - Text content for the slide
 * @param {Object} style - Styling options
 * @param {string} style.fontSize - Font size (default: '48px')
 * @param {string} style.fontFamily - Font family (default: 'Arial')
 * @param {string} style.color - Text color (default: '#FFFFFF')
 * @param {string} style.backgroundColor - Background color (default: '#000000')
 * @param {string} style.textAlign - Text alignment (default: 'center')
 * @param {string} backgroundImage - Optional background image path
 * @returns {Promise<Object>} Slide object
 */
async function createTextSlide(text, style = {}, backgroundImage = null) {
  const {
    fontSize = '48px',
    fontFamily = 'Arial, sans-serif',
    color = '#FFFFFF',
    backgroundColor = '#000000',
    textAlign = 'center'
  } = style;

  try {
    // Validate background image if provided
    if (backgroundImage && !await fs.pathExists(backgroundImage)) {
      throw new Error(`Background image not found: ${backgroundImage}`);
    }

    // Create slide object (HTML-based)
    const slide = {
      type: 'text',
      content: text,
      style: {
        fontSize,
        fontFamily,
        color,
        backgroundColor,
        textAlign
      },
      backgroundImage: backgroundImage,
      source: 'custom',
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      width: 1920,
      height: 1080
    };

    return slide;
  } catch (error) {
    throw new Error(`Failed to create text slide: ${error.message}`);
  }
}

/**
 * Import slides from a folder
 * 
 * Scans a folder for supported file types and imports them
 * 
 * @param {string} folderPath - Path to folder containing slides
 * @param {Object} options - Import options
 * @param {Array<string>} options.extensions - File extensions to include (default: ['.pdf', '.pptx', '.ppt'])
 * @param {boolean} options.recursive - Search subfolders (default: false)
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Array>} Array of all imported slides
 */
async function importFromFolder(folderPath, options = {}, progressCallback = null) {
  const {
    extensions = ['.pdf', '.pptx', '.ppt'],
    recursive = false
  } = options;

  try {
    // Validate folder exists
    if (!await fs.pathExists(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) {
      throw new Error('Path must be a directory');
    }

    // Find all matching files
    const files = [];
    
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && recursive) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await scanDirectory(folderPath);

    if (files.length === 0) {
      return [];
    }

    // Import all files
    const allSlides = [];
    
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const ext = path.extname(filePath).toLowerCase();
      
      if (progressCallback) {
        progressCallback({ 
          current: i + 1, 
          total: files.length, 
          message: `Importing ${path.basename(filePath)}...` 
        });
      }

      try {
        let slides;
        if (ext === '.pdf') {
          slides = await importPdf(filePath, options);
        } else if (['.pptx', '.ppt'].includes(ext)) {
          slides = await importPowerpoint(filePath, options);
        }
        
        if (slides) {
          allSlides.push(...slides);
        }
      } catch (error) {
        console.error(`Failed to import ${filePath}:`, error.message);
        // Continue with other files
      }
    }

    return allSlides;
  } catch (error) {
    throw new Error(`Failed to import from folder: ${error.message}`);
  }
}

/**
 * Validate a slide file
 * 
 * @param {string} filePath - Path to slide file
 * @returns {Promise<Object>} Validation result { valid: boolean, type: string, message: string }
 */
async function validateSlideFile(filePath) {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return {
        valid: false,
        type: null,
        message: 'File does not exist'
      };
    }

    // Check if it's a file
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return {
        valid: false,
        type: null,
        message: 'Path is not a file'
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
          pageCount
        };
      } catch (error) {
        return {
          valid: false,
          type: 'pdf',
          message: `Invalid PDF file: ${error.message}`
        };
      }
    } else if (['.pptx', '.ppt'].includes(ext)) {
      // Basic validation for PowerPoint
      const size = stat.size;
      if (size === 0) {
        return {
          valid: false,
          type: 'powerpoint',
          message: 'PowerPoint file is empty'
        };
      }
      
      return {
        valid: true,
        type: 'powerpoint',
        message: 'Valid PowerPoint file',
        size
      };
    } else {
      return {
        valid: false,
        type: null,
        message: `Unsupported file type: ${ext}`
      };
    }
  } catch (error) {
    return {
      valid: false,
      type: null,
      message: `Validation error: ${error.message}`
    };
  }
}

/**
 * Get metadata from a slide file
 * 
 * @param {string} filePath - Path to slide file
 * @returns {Promise<Object>} Metadata object
 */
async function getSlideMetadata(filePath) {
  try {
    if (!await fs.pathExists(filePath)) {
      throw new Error('File does not exist');
    }

    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext);

    const metadata = {
      filename: path.basename(filePath),
      basename,
      extension: ext,
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      path: filePath
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
        metadata.error = `Failed to read PDF metadata: ${error.message}`;
      }
    } else if (['.pptx', '.ppt'].includes(ext)) {
      metadata.type = 'powerpoint';
    }

    return metadata;
  } catch (error) {
    throw new Error(`Failed to get slide metadata: ${error.message}`);
  }
}

module.exports = {
  importPdf,
  importPowerpoint,
  createTextSlide,
  importFromFolder,
  validateSlideFile,
  getSlideMetadata
};
