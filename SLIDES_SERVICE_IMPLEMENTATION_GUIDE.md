# Slides Service Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the slides import service for HarmonySync. This service will enable users to import PowerPoint presentations, PDFs, and Google Slides into their worship presentations.

---

## Implementation Phases

### Phase 1: Core Service (Days 1-2)
- Create service file structure
- Implement PowerPoint import
- Implement PDF import
- Add basic error handling

### Phase 2: Integration (Days 3-4)
- Add IPC handlers
- Create frontend UI
- Implement progress tracking
- Add file validation

### Phase 3: Testing & Polish (Days 5-7)
- Write unit tests
- Write integration tests
- Security review
- Documentation

---

## Phase 1: Core Service Implementation

### Step 1.1: Install Dependencies

```bash
cd /home/runner/work/RustPresenter/RustPresenter
npm install --save pptxgenjs pdf-lib pdf2pic
```

**Verify versions**:
```json
{
  "dependencies": {
    "pptxgenjs": "^3.12.0",
    "pdf-lib": "^1.17.1",
    "pdf2pic": "^2.1.4"
  }
}
```

### Step 1.2: Create Service File

**File**: `electron/services/slides-service.js`

```javascript
const fs = require('fs-extra');
const path = require('path');
const PptxGenJS = require('pptxgenjs');
const { PDFDocument } = require('pdf-lib');
const { fromPath } = require('pdf2pic');
const { google } = require('googleapis');

/**
 * Slides Service
 * Handles importing and converting presentation files to HarmonySync slides
 */

// Cache directory for temporary slide processing
function getCacheDir() {
  const { app } = require('electron');
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache', 'slides');
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

/**
 * Import PowerPoint presentation
 * @param {string} pptxPath - Path to .pptx file
 * @param {Object} options - Import options
 * @returns {Promise<Array>} Array of slide objects
 */
async function importPowerPoint(pptxPath, options = {}) {
  const {
    outputDir = getCacheDir(),
    extractText = true,
    extractImages = true,
    imageFormat = 'png',
    maxWidth = 1920,
    maxHeight = 1080
  } = options;

  try {
    console.log(`Importing PowerPoint: ${pptxPath}`);
    
    // Validate file exists
    if (!await fs.pathExists(pptxPath)) {
      throw new Error(`File not found: ${pptxPath}`);
    }

    // Validate file size (max 100 MB)
    const stats = await fs.stat(pptxPath);
    if (stats.size > 100 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 100 MB.');
    }

    // Create PowerPoint instance
    const pptx = new PptxGenJS();
    
    // TODO: PptxGenJS is primarily for generation, not parsing
    // For actual import, we need a different approach:
    // 1. Use LibreOffice headless for conversion
    // 2. Use unoconv for PPT -> PDF -> Images
    // 3. Or use officegen for parsing (deprecated)
    
    // For MVP, we'll convert to PDF first, then to images
    // This requires LibreOffice or similar tool installed
    
    console.warn('PowerPoint import requires LibreOffice. Falling back to PDF conversion.');
    
    // Return placeholder for now
    return [{
      type: 'error',
      message: 'PowerPoint import requires additional system dependencies. Please convert to PDF first.'
    }];

  } catch (error) {
    console.error('Failed to import PowerPoint:', error);
    throw new Error(`PowerPoint import failed: ${error.message}`);
  }
}

/**
 * Import PDF as slides
 * @param {string} pdfPath - Path to PDF file
 * @param {Object} options - Import options
 * @returns {Promise<Array>} Array of slide objects
 */
async function importPdfAsSlides(pdfPath, options = {}) {
  const {
    outputDir = getCacheDir(),
    dpi = 300,
    format = 'png',
    width = 1920,
    height = 1080
  } = options;

  try {
    console.log(`Importing PDF: ${pdfPath}`);
    
    // Validate file exists
    if (!await fs.pathExists(pdfPath)) {
      throw new Error(`File not found: ${pdfPath}`);
    }

    // Validate file size (max 100 MB)
    const stats = await fs.stat(pdfPath);
    if (stats.size > 100 * 1024 * 1024) {
      throw new Error('PDF file too large. Maximum size is 100 MB.');
    }

    // Load PDF to get page count
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`PDF has ${pageCount} pages`);

    // Create output directory
    const pdfName = path.basename(pdfPath, '.pdf');
    const slideOutputDir = path.join(outputDir, pdfName);
    await fs.ensureDir(slideOutputDir);

    // Convert PDF pages to images
    const converter = fromPath(pdfPath, {
      density: dpi,
      format: format,
      width: width,
      height: height,
      savePath: slideOutputDir,
      saveFilename: 'slide',
      compression: 'jpeg'
    });

    const slides = [];

    for (let i = 1; i <= pageCount; i++) {
      try {
        const result = await converter(i, { responseType: 'image' });
        
        slides.push({
          type: 'image',
          path: result.path || path.join(slideOutputDir, `slide.${i}.${format}`),
          index: i - 1,
          pageNumber: i,
          source: 'pdf',
          sourcePath: pdfPath,
          name: `${pdfName} - Slide ${i}`
        });
        
        console.log(`Converted page ${i}/${pageCount}`);
      } catch (error) {
        console.error(`Failed to convert page ${i}:`, error);
        // Continue with other pages
      }
    }

    console.log(`Successfully imported ${slides.length} slides from PDF`);
    return slides;

  } catch (error) {
    console.error('Failed to import PDF:', error);
    throw new Error(`PDF import failed: ${error.message}`);
  }
}

/**
 * Import from Google Slides
 * @param {string} presentationId - Google Slides presentation ID
 * @param {Object} auth - Google OAuth2 credentials
 * @param {Object} options - Import options
 * @returns {Promise<Array>} Array of slide objects
 */
async function importFromGoogleSlides(presentationId, auth, options = {}) {
  const {
    outputDir = getCacheDir(),
    downloadFormat = 'png'
  } = options;

  try {
    console.log(`Importing from Google Slides: ${presentationId}`);
    
    // Initialize Google Slides API
    const slides = google.slides({ version: 'v1', auth });
    
    // Get presentation details
    const presentation = await slides.presentations.get({
      presentationId: presentationId
    });

    console.log(`Presentation: ${presentation.data.title}`);
    console.log(`Slides: ${presentation.data.slides.length}`);

    const slideObjects = [];

    // Export each slide as image
    // Note: Google Slides API doesn't directly provide image export
    // We need to use Drive API to export the presentation
    const drive = google.drive({ version: 'v3', auth });
    
    // Export entire presentation as PDF
    const pdfResponse = await drive.files.export({
      fileId: presentationId,
      mimeType: 'application/pdf'
    }, {
      responseType: 'arraybuffer'
    });

    // Save PDF temporarily
    const tempPdfPath = path.join(getCacheDir(), `${presentationId}.pdf`);
    await fs.writeFile(tempPdfPath, Buffer.from(pdfResponse.data));

    // Convert PDF to images
    const slides = await importPdfAsSlides(tempPdfPath, {
      outputDir: path.join(outputDir, presentation.data.title || presentationId),
      ...options
    });

    // Clean up temporary PDF
    await fs.remove(tempPdfPath);

    // Add Google Slides metadata
    const enhancedSlides = slides.map(slide => ({
      ...slide,
      source: 'google-slides',
      presentationId: presentationId,
      presentationTitle: presentation.data.title
    }));

    console.log(`Successfully imported ${enhancedSlides.length} slides from Google Slides`);
    return enhancedSlides;

  } catch (error) {
    console.error('Failed to import from Google Slides:', error);
    throw new Error(`Google Slides import failed: ${error.message}`);
  }
}

/**
 * Create a text slide with custom styling
 * @param {string} text - Slide text content
 * @param {Object} style - Text styling options
 * @param {Object} background - Background options
 * @returns {Promise<Object>} Slide object
 */
async function createTextSlide(text, style = {}, background = {}) {
  const textService = require('./text-service');
  
  try {
    const html = textService.generateSlideHTML(text, style);
    const css = textService.generateBackgroundCSS(background);
    
    return {
      type: 'text',
      content: text,
      html: html,
      css: css,
      style: style,
      background: background,
      created: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to create text slide:', error);
    throw new Error(`Text slide creation failed: ${error.message}`);
  }
}

/**
 * Create an image slide
 * @param {string} imagePath - Path to image file
 * @param {string} caption - Optional caption
 * @returns {Promise<Object>} Slide object
 */
async function createImageSlide(imagePath, caption = '') {
  try {
    // Validate image exists
    if (!await fs.pathExists(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    // Get image metadata using image-service
    const imageService = require('./image-service');
    const metadata = await imageService.getImageMetadata(imagePath);

    return {
      type: 'image',
      path: imagePath,
      caption: caption,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      created: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to create image slide:', error);
    throw new Error(`Image slide creation failed: ${error.message}`);
  }
}

/**
 * Batch import slides from a folder
 * @param {string} folderPath - Path to folder containing slides
 * @param {Object} options - Import options
 * @returns {Promise<Array>} Array of imported slides
 */
async function importSlidesFromFolder(folderPath, options = {}) {
  try {
    console.log(`Importing slides from folder: ${folderPath}`);
    
    // Validate folder exists
    if (!await fs.pathExists(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    const files = await fs.readdir(folderPath);
    const slides = [];
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const ext = path.extname(file).toLowerCase();
      
      try {
        if (ext === '.pdf') {
          const pdfSlides = await importPdfAsSlides(filePath, options);
          slides.push(...pdfSlides);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)) {
          const imageSlide = await createImageSlide(filePath);
          slides.push(imageSlide);
        } else if (ext === '.txt') {
          // Import text file as slide
          const text = await fs.readFile(filePath, 'utf8');
          const textSlide = await createTextSlide(text);
          slides.push(textSlide);
        }
        // Skip unsupported formats
      } catch (error) {
        console.error(`Failed to import ${file}:`, error);
        // Continue with other files
      }
    }

    console.log(`Successfully imported ${slides.length} slides from folder`);
    return slides;

  } catch (error) {
    console.error('Failed to import from folder:', error);
    throw new Error(`Folder import failed: ${error.message}`);
  }
}

/**
 * Validate slide file
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} Validation result
 */
async function validateSlideFile(filePath) {
  try {
    if (!await fs.pathExists(filePath)) {
      return { valid: false, error: 'File not found' };
    }

    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const maxSize = 100 * 1024 * 1024; // 100 MB

    if (stats.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB.` 
      };
    }

    const supportedFormats = ['.pdf', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.txt'];
    
    if (!supportedFormats.includes(ext)) {
      return { 
        valid: false, 
        error: `Unsupported format. Supported: ${supportedFormats.join(', ')}` 
      };
    }

    return { 
      valid: true, 
      format: ext,
      size: stats.size,
      sizeReadable: `${(stats.size / 1024 / 1024).toFixed(1)} MB`
    };

  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get supported file formats
 * @returns {Array} Array of supported formats
 */
function getSupportedFormats() {
  return [
    { ext: '.pdf', name: 'PDF Document', priority: 1 },
    { ext: '.pptx', name: 'PowerPoint Presentation', priority: 2 },
    { ext: '.png', name: 'PNG Image', priority: 3 },
    { ext: '.jpg', name: 'JPEG Image', priority: 3 },
    { ext: '.jpeg', name: 'JPEG Image', priority: 3 },
    { ext: '.gif', name: 'GIF Image', priority: 4 },
    { ext: '.bmp', name: 'Bitmap Image', priority: 5 },
    { ext: '.txt', name: 'Text File', priority: 6 }
  ];
}

module.exports = {
  importPowerPoint,
  importPdfAsSlides,
  importFromGoogleSlides,
  createTextSlide,
  createImageSlide,
  importSlidesFromFolder,
  validateSlideFile,
  getSupportedFormats
};
```

---

## Phase 2: Integration

### Step 2.1: Add IPC Handlers

**File**: `electron/ipc-handlers.js`

Add to the file:

```javascript
// Import slides service
const slidesService = require('./services/slides-service');

// Add to setupIpcHandlers function:

// Slides Service Handlers
ipcMain.handle('slides:importPowerPoint', async (event, pptxPath, options) => {
  return await slidesService.importPowerPoint(pptxPath, options);
});

ipcMain.handle('slides:importPdf', async (event, pdfPath, options) => {
  return await slidesService.importPdfAsSlides(pdfPath, options);
});

ipcMain.handle('slides:importGoogleSlides', async (event, presentationId, auth, options) => {
  return await slidesService.importFromGoogleSlides(presentationId, auth, options);
});

ipcMain.handle('slides:createTextSlide', async (event, text, style, background) => {
  return await slidesService.createTextSlide(text, style, background);
});

ipcMain.handle('slides:createImageSlide', async (event, imagePath, caption) => {
  return await slidesService.createImageSlide(imagePath, caption);
});

ipcMain.handle('slides:importFromFolder', async (event, folderPath, options) => {
  return await slidesService.importSlidesFromFolder(folderPath, options);
});

ipcMain.handle('slides:validateFile', async (event, filePath) => {
  return await slidesService.validateSlideFile(filePath);
});

ipcMain.handle('slides:getSupportedFormats', async (event) => {
  return slidesService.getSupportedFormats();
});
```

### Step 2.2: Register in Main Process

**File**: `electron/main.js`

Add import:

```javascript
const slidesService = require('./services/slides-service');
```

Pass to IPC handlers:

```javascript
setupIpcHandlers(
  mainWindow,
  audienceWindow,
  // ... other windows
  slidesService  // Add this
);
```

### Step 2.3: Create Frontend Component

**File**: `harmonysync/src/components/slides/SlideImporter.jsx`

```javascript
import React, { useState } from 'react';
import { core, dialog } from '../../electron-adapter';
import { ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';

const SlideImporter = ({ onSlidesImported }) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleImportPdf = async () => {
    try {
      // Open file picker
      const result = await dialog.showOpenDialog({
        title: 'Import PDF Slides',
        filters: [
          { name: 'PDF Documents', extensions: ['pdf'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths[0]) {
        return;
      }

      const pdfPath = result.filePaths[0];
      
      setImporting(true);
      setStatus('Validating file...');

      // Validate file
      const validation = await core.invoke('slides:validateFile', pdfPath);
      
      if (!validation.valid) {
        alert(`Invalid file: ${validation.error}`);
        setImporting(false);
        return;
      }

      setStatus(`Importing ${validation.sizeReadable} PDF...`);

      // Import PDF
      const slides = await core.invoke('slides:importPdf', pdfPath, {
        dpi: 300,
        format: 'png'
      });

      setStatus(`Successfully imported ${slides.length} slides`);
      
      // Notify parent component
      if (onSlidesImported) {
        onSlidesImported(slides);
      }

      setTimeout(() => {
        setImporting(false);
        setStatus('');
      }, 2000);

    } catch (error) {
      console.error('Failed to import PDF:', error);
      alert(`Import failed: ${error.message}`);
      setImporting(false);
      setStatus('');
    }
  };

  const handleImportFolder = async () => {
    try {
      // Open folder picker
      const result = await dialog.showOpenDialog({
        title: 'Import Slides from Folder',
        properties: ['openDirectory']
      });

      if (result.canceled || !result.filePaths[0]) {
        return;
      }

      const folderPath = result.filePaths[0];
      
      setImporting(true);
      setStatus('Scanning folder...');

      // Import from folder
      const slides = await core.invoke('slides:importFromFolder', folderPath);

      setStatus(`Successfully imported ${slides.length} slides`);
      
      // Notify parent component
      if (onSlidesImported) {
        onSlidesImported(slides);
      }

      setTimeout(() => {
        setImporting(false);
        setStatus('');
      }, 2000);

    } catch (error) {
      console.error('Failed to import folder:', error);
      alert(`Import failed: ${error.message}`);
      setImporting(false);
      setStatus('');
    }
  };

  return (
    <div className="slide-importer">
      <div className="import-buttons">
        <button
          onClick={handleImportPdf}
          disabled={importing}
          className="btn-import"
        >
          <DocumentIcon className="w-5 h-5 mr-2" />
          Import PDF
        </button>

        <button
          onClick={handleImportFolder}
          disabled={importing}
          className="btn-import"
        >
          <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
          Import Folder
        </button>
      </div>

      {importing && (
        <div className="import-status">
          <div className="spinner" />
          <p>{status}</p>
        </div>
      )}
    </div>
  );
};

export default SlideImporter;
```

### Step 2.4: Integrate into SlideManager

**File**: `harmonysync/src/components/slides/SlideManager.jsx`

Add import:

```javascript
import SlideImporter from './SlideImporter.jsx';
```

Add importer component:

```javascript
<div className="slide-controls">
  <SlideImporter onSlidesImported={handleSlidesImported} />
  {/* ... existing controls */}
</div>
```

Add handler:

```javascript
const handleSlidesImported = (slides) => {
  // Add imported slides to current presentation
  setAllSlides(prevSlides => [...prevSlides, ...slides]);
  
  // Save to presentation file
  // TODO: Implement save logic
};
```

---

## Phase 3: Testing

### Step 3.1: Unit Tests

**File**: `electron/services/__tests__/slides-service.test.js`

```javascript
const slidesService = require('../slides-service');
const fs = require('fs-extra');
const path = require('path');

describe('Slides Service', () => {
  describe('validateSlideFile', () => {
    it('should validate PDF files', async () => {
      // Mock test
      const result = await slidesService.validateSlideFile('/path/to/test.pdf');
      expect(result).toHaveProperty('valid');
    });

    it('should reject oversized files', async () => {
      // Test file size limit
    });

    it('should reject unsupported formats', async () => {
      // Test format validation
    });
  });

  describe('getSupportedFormats', () => {
    it('should return array of supported formats', () => {
      const formats = slidesService.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });
  });

  describe('createTextSlide', () => {
    it('should create a text slide with default styling', async () => {
      const slide = await slidesService.createTextSlide('Test content');
      expect(slide.type).toBe('text');
      expect(slide.content).toBe('Test content');
      expect(slide).toHaveProperty('html');
      expect(slide).toHaveProperty('css');
    });
  });

  // Add more tests...
});
```

### Step 3.2: Integration Tests

Test the complete workflow from file selection to slide display.

### Step 3.3: Security Tests

Test file validation, size limits, and malicious file handling.

---

## System Requirements

### Required System Dependencies

**For PDF to Image Conversion (pdf2pic)**:
- GraphicsMagick or ImageMagick must be installed

**Installation Instructions**:

```bash
# Ubuntu/Debian
sudo apt-get install graphicsmagick

# macOS
brew install graphicsmagick

# Windows
# Download and install from: http://www.graphicsmagick.org/download.html
```

### Optional Dependencies

**For PowerPoint Import (future enhancement)**:
- LibreOffice (for .pptx conversion)

```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# macOS
brew install --cask libreoffice

# Windows
# Download from: https://www.libreoffice.org/download/
```

---

## Usage Examples

### Example 1: Import PDF

```javascript
// In React component
import { core } from '../../electron-adapter';

const importPdfSlides = async (pdfPath) => {
  try {
    const slides = await core.invoke('slides:importPdf', pdfPath, {
      dpi: 300,
      format: 'png',
      width: 1920,
      height: 1080
    });

    console.log(`Imported ${slides.length} slides`);
    
    // slides array structure:
    // [
    //   {
    //     type: 'image',
    //     path: '/path/to/slide.1.png',
    //     index: 0,
    //     pageNumber: 1,
    //     source: 'pdf',
    //     sourcePath: '/path/to/document.pdf',
    //     name: 'document - Slide 1'
    //   },
    //   ...
    // ]

    return slides;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};
```

### Example 2: Import from Folder

```javascript
const importFolder = async (folderPath) => {
  const slides = await core.invoke('slides:importFromFolder', folderPath);
  
  // Slides will include all PDFs, images, and text files from folder
  console.log(`Imported ${slides.length} slides from folder`);
  
  return slides;
};
```

### Example 3: Create Text Slide

```javascript
const createTextSlide = async () => {
  const slide = await core.invoke('slides:createTextSlide',
    'Welcome to our service!',
    {
      fontSize: '64px',
      color: '#ffffff',
      textAlign: 'center'
    },
    {
      color1: { r: 30, g: 60, b: 120 },
      color2: { r: 60, g: 120, b: 180 },
      animationDuration: 15
    }
  );

  console.log('Created text slide:', slide);
  return slide;
};
```

---

## Troubleshooting

### Issue: "pdf2pic requires GraphicsMagick"

**Solution**: Install GraphicsMagick:
```bash
sudo apt-get install graphicsmagick
```

### Issue: "File too large"

**Solution**: PDF files must be under 100 MB. Split large PDFs or reduce quality.

### Issue: "PowerPoint import not working"

**Solution**: PowerPoint direct import requires additional system dependencies. Convert to PDF first using PowerPoint's "Save as PDF" feature.

### Issue: "Import is slow"

**Solution**: 
- Reduce DPI from 300 to 150 for faster conversion
- Process slides in batches
- Use smaller file sizes

---

## Performance Optimization

### Memory Management

```javascript
// Process slides in batches to avoid memory spikes
async function importLargePdf(pdfPath) {
  const BATCH_SIZE = 10;
  
  // Get page count
  const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
  const pageCount = pdfDoc.getPageCount();
  
  const allSlides = [];
  
  for (let i = 0; i < pageCount; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, pageCount);
    console.log(`Processing pages ${i+1}-${batchEnd}...`);
    
    // Process batch
    const batchSlides = await processPdfBatch(pdfPath, i + 1, batchEnd);
    allSlides.push(...batchSlides);
    
    // Allow garbage collection
    if (global.gc) {
      global.gc();
    }
  }
  
  return allSlides;
}
```

### CPU Usage

```javascript
// Limit concurrent conversions
const pLimit = require('p-limit');
const limit = pLimit(2); // Only 2 concurrent conversions

async function convertMultipleFiles(filePaths) {
  const promises = filePaths.map(filePath =>
    limit(() => importPdfAsSlides(filePath))
  );
  
  return Promise.all(promises);
}
```

---

## Security Best Practices

### 1. File Validation

Always validate files before processing:
```javascript
const validation = await slidesService.validateSlideFile(filePath);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### 2. Size Limits

Enforce maximum file sizes:
```javascript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

if (stats.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

### 3. Path Sanitization

Always use path.resolve() to prevent directory traversal:
```javascript
const safePath = path.resolve(basePath, userProvidedPath);
if (!safePath.startsWith(basePath)) {
  throw new Error('Invalid path');
}
```

### 4. Format Validation

Only process known safe formats:
```javascript
const SAFE_FORMATS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt'];
const ext = path.extname(filePath).toLowerCase();

if (!SAFE_FORMATS.includes(ext)) {
  throw new Error('Unsupported format');
}
```

---

## Documentation Updates

### Update SERVICES_SUMMARY.md

Add slides service to the services list.

### Update README.md

Add feature description for slide import.

### Create User Guide

Document how to import slides for end users.

---

## Deployment Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Create `slides-service.js`
- [ ] Add IPC handlers
- [ ] Create frontend component
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Security review
- [ ] Update documentation
- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Create user guide
- [ ] Update changelog

---

## Future Enhancements

### Phase 4: Advanced Features (Future)

1. **PowerPoint Direct Import**
   - Implement LibreOffice integration
   - Parse .pptx files directly
   - Extract animations and transitions

2. **Google Slides Real-time Sync**
   - Watch for presentation changes
   - Auto-update imported slides
   - Collaborative editing support

3. **Slide Templates**
   - Predefined layouts
   - Theme system
   - Custom fonts and colors

4. **Slide Editing**
   - In-app slide editor
   - Text overlays
   - Image cropping and effects

5. **ProPresenter Import**
   - Parse .pro7 files
   - Migration tool
   - Compatibility layer

---

## Conclusion

This implementation guide provides a complete roadmap for adding slide import functionality to HarmonySync. The service is designed to be lightweight, efficient, and secure, following the existing architecture patterns in the codebase.

**Estimated Timeline**: 1-2 weeks  
**Priority**: High  
**Complexity**: Medium  
**Dependencies**: 3 npm packages + system tools  

---

**Document Version**: 1.0  
**Created**: January 2025  
**Last Updated**: January 2025  
**Status**: Ready for Implementation
