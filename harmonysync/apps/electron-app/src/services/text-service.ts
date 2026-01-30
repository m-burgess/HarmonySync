/**
 * Text Service (In-Process - Text Processing Only)
 * 
 * This service runs IN-PROCESS as it only performs lightweight text and CSS operations.
 * 
 * This service is responsible for:
 * - Text and CSS generation for slides
 * - Lyrics formatting and parsing
 * - HTML generation for text slides
 * - Background CSS animation generation
 * - Text wrapping and formatting
 * - Simple string manipulation
 * 
 * All operations are purely string-based and extremely fast, making them
 * suitable for in-process execution without risking UI freezing.
 * 
 * No CPU-intensive operations are performed - just text manipulation and HTML/CSS generation.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { BaseElectronService, ITextService, ServiceConfig } from '../types/services';

/**
 * RGB color object
 */
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Background CSS generation options
 */
interface BackgroundCSSOptions {
  color1?: RGBColor;
  color2?: RGBColor;
  color3?: RGBColor;
  animationDuration?: number;
  angle?: number;
}

/**
 * Text styling options
 */
interface TextStyleOptions {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  textShadow?: string;
  lineHeight?: string;
  letterSpacing?: string;
}

/**
 * Slide object with lyrics sections
 */
interface LyricsSlide {
  section: string | null;
  lines: string[];
  text: string;
}

/**
 * Text statistics
 */
interface TextStatistics {
  characters: number;
  words: number;
  lines: number;
  paragraphs: number;
}

/**
 * Text Service Implementation
 * Provides text processing, CSS generation, and lyrics handling capabilities
 */
export class TextService extends BaseElectronService implements ITextService {
  protected readonly serviceName = 'TextService';

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the text service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Text service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Text service disposed');
  }

  /**
   * Render text (main interface method for ITextService)
   * @param text - Text to render
   * @param options - Rendering options
   * @returns Rendered HTML or path to rendered file
   */
  public async render(text: string, options?: any): Promise<string> {
    try {
      // Generate HTML with styling
      const html = this.generateSlideHTML(text, options);
      return html;
    } catch (error) {
      this.handleError('render', error);
    }
  }

  /**
   * Generate animated gradient background CSS
   * @param options - Configuration options
   * @returns CSS content
   */
  public generateBackgroundCSS(options: BackgroundCSSOptions = {}): string {
    const color1 = options.color1 || this.generateRandomColor();
    const color2 = options.color2 || this.generateRandomColor();
    const color3 = options.color3 || this.generateRandomColor();
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
   * @param dirPath - Directory path
   * @param css - CSS content
   * @returns Path to CSS file
   */
  public async writeBackgroundCSS(dirPath: string, css: string): Promise<string> {
    try {
      const cssPath = path.join(dirPath, 'background.css');
      await fs.ensureDir(dirPath);
      await fs.writeFile(cssPath, css, 'utf8');
      this.log('info', `Background CSS written: ${cssPath}`);
      return cssPath;
    } catch (error) {
      this.handleError('writeBackgroundCSS', error);
    }
  }

  /**
   * Generate and save background CSS
   * @param dirPath - Directory path
   * @param options - Configuration options
   * @returns CSS content
   */
  public async generateAndSaveCSS(dirPath: string, options: BackgroundCSSOptions = {}): Promise<string> {
    try {
      const cssPath = path.join(dirPath, 'background.css');

      // Check if CSS already exists
      if (await fs.pathExists(cssPath)) {
        this.log('debug', `Background CSS already exists: ${cssPath}`);
        return await fs.readFile(cssPath, 'utf8');
      }

      const css = this.generateBackgroundCSS(options);
      await this.writeBackgroundCSS(dirPath, css);
      return css;
    } catch (error) {
      this.handleError('generateAndSaveCSS', error);
    }
  }

  /**
   * Format lyrics with sections
   * @param lyrics - Raw lyrics text
   * @returns Formatted lyrics with section markers
   */
  public formatLyrics(lyrics: string): string {
    if (!lyrics) return '';

    let formatted = lyrics.trim();

    // Ensure section markers are on their own lines
    formatted = formatted.replace(/\[([^\]]+)\]/g, '\n[$1]\n');

    // Remove excessive blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
  }

  /**
   * Split lyrics into slides
   * @param lyrics - Formatted lyrics
   * @param linesPerSlide - Lines per slide (default: 4)
   * @returns Array of slide objects
   */
  public splitLyricsIntoSlides(lyrics: string, linesPerSlide: number = 4): LyricsSlide[] {
    if (!lyrics) return [];

    const lines = lyrics.split('\n');
    const slides: LyricsSlide[] = [];
    let currentSlide: string[] = [];
    let currentSection: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if this is a section marker
      const sectionMatch =
        trimmedLine.match(/^\[([^\]]+)\]$/) ||
        trimmedLine.match(/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)(\s+\d+)?:?$/i);

      if (sectionMatch) {
        // Save current slide if it has content
        if (currentSlide.length > 0) {
          slides.push({
            section: currentSection,
            lines: currentSlide,
            text: currentSlide.join('\n'),
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
          text: currentSlide.join('\n'),
        });
        currentSlide = [];
      }
    }

    // Add remaining lines as the last slide
    if (currentSlide.length > 0) {
      slides.push({
        section: currentSection,
        lines: currentSlide,
        text: currentSlide.join('\n'),
      });
    }

    return slides;
  }

  /**
   * Generate slide text HTML
   * @param text - Slide text
   * @param style - Text styling options
   * @returns HTML string
   */
  public generateSlideHTML(text: string, style: TextStyleOptions = {}): string {
    const {
      fontFamily = 'Arial, sans-serif',
      fontSize = '48px',
      color = '#ffffff',
      textAlign = 'center',
      textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight = '1.5',
    } = style;

    const lines = text.split('\n');
    const htmlLines = lines
      .map((line) => (line.trim() ? `<p>${this.escapeHtml(line)}</p>` : '<p>&nbsp;</p>'))
      .join('\n');

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
   * @param text - Text to escape
   * @returns Escaped text
   */
  public escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Extract text from various file formats
   * @param filePath - Path to the file
   * @returns Extracted text
   */
  public async extractTextFromFile(filePath: string): Promise<string> {
    try {
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.txt') {
        return await fs.readFile(filePath, 'utf8');
      }

      // For other formats, we would need additional libraries
      // For now, just support .txt files
      throw new Error(`Unsupported file format: ${ext}`);
    } catch (error) {
      this.handleError('extractTextFromFile', error);
    }
  }

  /**
   * Word wrap text to specified width
   * @param text - Text to wrap
   * @param maxWidth - Maximum line width in characters
   * @returns Wrapped text
   */
  public wordWrap(text: string, maxWidth: number = 80): string {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine: string[] = [];
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
   * @param style - Text style options
   * @returns CSS string
   */
  public generateTextCSS(style: TextStyleOptions = {}): string {
    const {
      fontFamily = 'Arial, sans-serif',
      fontSize = '48px',
      fontWeight = 'normal',
      color = '#ffffff',
      textAlign = 'center',
      textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight = '1.5',
      letterSpacing = 'normal',
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
   * @param text - Text to count
   * @returns Word count
   */
  public countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Get text statistics
   * @param text - Text to analyze
   * @returns Text statistics
   */
  public getTextStats(text: string): TextStatistics {
    if (!text) {
      return {
        characters: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
      };
    }

    const lines = text.split('\n');
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

    return {
      characters: text.length,
      words: this.countWords(text),
      lines: lines.length,
      paragraphs: paragraphs.length,
    };
  }

  /**
   * Generate random RGB color
   * @param min - Minimum value (default: 100)
   * @param max - Maximum value (default: 255)
   * @returns RGB color object
   */
  private generateRandomColor(min: number = 100, max: number = 255): RGBColor {
    return {
      r: Math.floor(Math.random() * (max - min + 1)) + min,
      g: Math.floor(Math.random() * (max - min + 1)) + min,
      b: Math.floor(Math.random() * (max - min + 1)) + min,
    };
  }
}

// Export singleton instance
let textServiceInstance: TextService | null = null;

/**
 * Get or create the text service singleton
 */
export function getTextService(config?: ServiceConfig): TextService {
  if (!textServiceInstance) {
    textServiceInstance = new TextService(config);
  }
  return textServiceInstance;
}

// Export for backward compatibility
export default TextService;
