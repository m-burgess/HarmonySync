const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

/**
 * Text Service
 * Handles text and CSS operations including background CSS generation,
 * text formatting, slide text rendering, and font management.
 */

// Get cache directory for text operations
function getCacheDir() {
  const appData = app.getPath('userData');
  const cacheDir = path.join(appData, 'harmonysync', 'cache', 'text');
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

/**
 * Generate random RGB color
 * @param {number} min - Minimum value (default: 100)
 * @param {number} max - Maximum value (default: 255)
 * @returns {Object} RGB color object
 */
function generateRandomColor(min = 100, max = 255) {
  return {
    r: Math.floor(Math.random() * (max - min + 1)) + min,
    g: Math.floor(Math.random() * (max - min + 1)) + min,
    b: Math.floor(Math.random() * (max - min + 1)) + min
  };
}

/**
 * Generate animated gradient background CSS
 * @param {Object} options - Configuration options
 * @returns {string} CSS content
 */
function generateBackgroundCSS(options = {}) {
  const color1 = options.color1 || generateRandomColor();
  const color2 = options.color2 || generateRandomColor();
  const color3 = options.color3 || generateRandomColor();
  const animationDuration = options.animationDuration || 15;
  const angle = options.angle || -45;
  
  const css = `body {
    background: linear-gradient(${angle}deg, rgb(${color1.r}, ${color1.g}, ${color1.b}), rgb(${color2.r}, ${color2.g}, ${color2.b}), rgb(${color3.r}, ${color3.g}, ${color3.b}));
    background-size: 400% 400%;
    animation: gradient ${animationDuration}s ease infinite;
}

@keyframes gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}`;
  
  return css;
}

/**
 * Write CSS to file
 * @param {string} dirPath - Directory path
 * @param {string} css - CSS content
 * @returns {Promise<string>} Path to CSS file
 */
async function writeBackgroundCSS(dirPath, css) {
  try {
    const cssPath = path.join(dirPath, 'background.css');
    await fs.ensureDir(dirPath);
    await fs.writeFile(cssPath, css, 'utf8');
    console.log(`Background CSS written: ${cssPath}`);
    return cssPath;
  } catch (err) {
    throw new Error(`Failed to write CSS file: ${err.message}`);
  }
}

/**
 * Generate and save background CSS
 * @param {string} dirPath - Directory path
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} CSS content
 */
async function generateAndSaveCSS(dirPath, options = {}) {
  const cssPath = path.join(dirPath, 'background.css');
  
  // Check if CSS already exists
  if (await fs.pathExists(cssPath)) {
    console.log(`Background CSS already exists: ${cssPath}`);
    return await fs.readFile(cssPath, 'utf8');
  }
  
  const css = generateBackgroundCSS(options);
  await writeBackgroundCSS(dirPath, css);
  return css;
}

/**
 * Format lyrics with sections
 * @param {string} lyrics - Raw lyrics text
 * @returns {string} Formatted lyrics with section markers
 */
function formatLyrics(lyrics) {
  if (!lyrics) return '';
  
  // Common section markers
  const sectionPatterns = [
    /^\[([^\]]+)\]/gm,  // [Verse 1], [Chorus], etc.
    /^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)(\s+\d+)?:?/gmi
  ];
  
  let formatted = lyrics.trim();
  
  // Ensure section markers are on their own lines
  formatted = formatted.replace(/\[([^\]]+)\]/g, '\n[$1]\n');
  
  // Remove excessive blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

/**
 * Split lyrics into slides
 * @param {string} lyrics - Formatted lyrics
 * @param {number} linesPerSlide - Lines per slide (default: 4)
 * @returns {Array<Object>} Array of slide objects
 */
function splitLyricsIntoSlides(lyrics, linesPerSlide = 4) {
  if (!lyrics) return [];
  
  const lines = lyrics.split('\n');
  const slides = [];
  let currentSlide = [];
  let currentSection = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section marker
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/) || 
                        trimmedLine.match(/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)(\s+\d+)?:?$/i);
    
    if (sectionMatch) {
      // Save current slide if it has content
      if (currentSlide.length > 0) {
        slides.push({
          section: currentSection,
          lines: currentSlide,
          text: currentSlide.join('\n')
        });
        currentSlide = [];
      }
      currentSection = sectionMatch[1] || sectionMatch[0];
      continue;
    }
    
    // Skip empty lines unless we're in the middle of a slide
    if (!trimmedLine && currentSlide.length === 0) continue;
    
    currentSlide.push(line);
    
    // Create new slide if we've reached the line limit
    if (currentSlide.length >= linesPerSlide) {
      slides.push({
        section: currentSection,
        lines: currentSlide,
        text: currentSlide.join('\n')
      });
      currentSlide = [];
    }
  }
  
  // Add remaining lines as the last slide
  if (currentSlide.length > 0) {
    slides.push({
      section: currentSection,
      lines: currentSlide,
      text: currentSlide.join('\n')
    });
  }
  
  return slides;
}

/**
 * Generate slide text HTML
 * @param {string} text - Slide text
 * @param {Object} style - Text styling options
 * @returns {string} HTML string
 */
function generateSlideHTML(text, style = {}) {
  const {
    fontFamily = 'Arial, sans-serif',
    fontSize = '48px',
    color = '#ffffff',
    textAlign = 'center',
    textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)',
    lineHeight = '1.5'
  } = style;
  
  const lines = text.split('\n');
  const htmlLines = lines.map(line => 
    line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p>&nbsp;</p>'
  ).join('\n');
  
  return `
<div style="
  font-family: ${fontFamily};
  font-size: ${fontSize};
  color: ${color};
  text-align: ${textAlign};
  text-shadow: ${textShadow};
  line-height: ${lineHeight};
  padding: 20px;
">
  ${htmlLines}
</div>
  `.trim();
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract text from various file formats
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.txt') {
      return await fs.readFile(filePath, 'utf8');
    }
    
    // For other formats, we would need additional libraries
    // For now, just support .txt files
    throw new Error(`Unsupported file format: ${ext}`);
  } catch (err) {
    throw new Error(`Failed to extract text: ${err.message}`);
  }
}

/**
 * Word wrap text to specified width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum line width in characters
 * @returns {string} Wrapped text
 */
function wordWrap(text, maxWidth = 80) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = [];
  let currentLength = 0;
  
  for (const word of words) {
    if (currentLength + word.length + 1 > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.join(' '));
      currentLine = [word];
      currentLength = word.length;
    } else {
      currentLine.push(word);
      currentLength += word.length + (currentLine.length > 1 ? 1 : 0);
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }
  
  return lines.join('\n');
}

/**
 * Generate CSS for text styling
 * @param {Object} style - Text style options
 * @returns {string} CSS string
 */
function generateTextCSS(style = {}) {
  const {
    fontFamily = 'Arial, sans-serif',
    fontSize = '48px',
    fontWeight = 'normal',
    color = '#ffffff',
    textAlign = 'center',
    textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)',
    lineHeight = '1.5',
    letterSpacing = 'normal'
  } = style;
  
  return `.slide-text {
  font-family: ${fontFamily};
  font-size: ${fontSize};
  font-weight: ${fontWeight};
  color: ${color};
  text-align: ${textAlign};
  text-shadow: ${textShadow};
  line-height: ${lineHeight};
  letter-spacing: ${letterSpacing};
}`;
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Get text statistics
 * @param {string} text - Text to analyze
 * @returns {Object} Text statistics
 */
function getTextStats(text) {
  if (!text) {
    return {
      characters: 0,
      words: 0,
      lines: 0,
      paragraphs: 0
    };
  }
  
  const lines = text.split('\n');
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  return {
    characters: text.length,
    words: countWords(text),
    lines: lines.length,
    paragraphs: paragraphs.length
  };
}

module.exports = {
  generateBackgroundCSS,
  writeBackgroundCSS,
  generateAndSaveCSS,
  formatLyrics,
  splitLyricsIntoSlides,
  generateSlideHTML,
  escapeHtml,
  extractTextFromFile,
  wordWrap,
  generateTextCSS,
  countWords,
  getTextStats
};
