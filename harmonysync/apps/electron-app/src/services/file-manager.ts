/**
 * File Manager Service
 * Handles file system operations with a clean OOP interface
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseElectronService } from '../types/services';
import { IFileManager, ServiceConfig } from '../types/services';
import { DirectoryEntry } from '../types/models';

/**
 * Background CSS generation options
 */
interface BackgroundCssOptions {
  colors?: Array<{ r: number; g: number; b: number }>;
  animationDuration?: number;
}

/**
 * File Manager Service Implementation
 * Provides file system operations with proper error handling and logging
 */
export class FileManagerService extends BaseElectronService implements IFileManager {
  protected readonly serviceName = 'FileManagerService';

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the file manager service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'File manager service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'File manager service disposed');
  }

  /**
   * Read file contents
   * @param filePath - Path to file
   * @returns File content as string
   */
  public async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.log('debug', `Read file: ${filePath}`);
      return content;
    } catch (error) {
      this.handleError(`readFile(${filePath})`, error);
    }
  }

  /**
   * Write file contents
   * @param filePath - Path to file
   * @param content - Content to write
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      this.log('debug', `Wrote file: ${filePath}`);
    } catch (error) {
      this.handleError(`writeFile(${filePath})`, error);
    }
  }

  /**
   * Read directory contents
   * @param dirPath - Path to directory
   * @returns Array of directory entries
   */
  public async readDir(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const entries = files.map(file => file.name);
      this.log('debug', `Read directory: ${dirPath}, found ${entries.length} entries`);
      return entries;
    } catch (error) {
      this.handleError(`readDir(${dirPath})`, error);
    }
  }

  /**
   * Read directory with detailed file information
   * @param dirPath - Path to directory
   * @returns Array of directory entries with detailed information
   */
  public async readDirDetailed(dirPath: string): Promise<DirectoryEntry[]> {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const entries: DirectoryEntry[] = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.stat(filePath);
          
          return {
            name: file.name,
            path: filePath,
            isDirectory: file.isDirectory(),
            size: stats.size,
            modifiedTime: stats.mtime,
            createdTime: stats.birthtime
          };
        })
      );
      
      this.log('debug', `Read directory (detailed): ${dirPath}, found ${entries.length} entries`);
      return entries;
    } catch (error) {
      this.handleError(`readDirDetailed(${dirPath})`, error);
    }
  }

  /**
   * Check if file or directory exists
   * @param filePath - Path to check
   * @returns True if exists, false otherwise
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      this.log('warn', `Error checking existence of ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Create directory (and parent directories if needed)
   * @param dirPath - Path to directory
   */
  public async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
      this.log('debug', `Created directory: ${dirPath}`);
    } catch (error) {
      this.handleError(`mkdir(${dirPath})`, error);
    }
  }

  /**
   * Copy file to destination
   * @param src - Source file path
   * @param dest - Destination file path
   */
  public async copyFile(src: string, dest: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);
      this.log('debug', `Copied file: ${src} -> ${dest}`);
    } catch (error) {
      this.handleError(`copyFile(${src}, ${dest})`, error);
    }
  }

  /**
   * Generate or retrieve background CSS with animated gradient
   * @param dirPath - Directory path where CSS will be stored
   * @param options - Optional customization options
   * @returns Generated CSS content
   */
  public async generateBackgroundCss(
    dirPath: string,
    options?: BackgroundCssOptions
  ): Promise<string> {
    const cssPath = path.join(dirPath, 'background.css');

    try {
      // Check if it already exists
      if (await fs.pathExists(cssPath)) {
        const existingCss = await fs.readFile(cssPath, 'utf8');
        this.log('debug', `Using existing background.css from ${dirPath}`);
        return existingCss;
      }

      // Generate random gradient colors or use provided ones
      const colors = options?.colors || this.generateRandomColors(3);
      const animationDuration = options?.animationDuration || 15;

      const css = this.createGradientCss(colors, animationDuration);

      // Save CSS file
      await fs.ensureDir(path.dirname(cssPath));
      await fs.writeFile(cssPath, css);

      this.log('info', `Generated new background.css in ${dirPath}`);
      return css;
    } catch (error) {
      this.handleError(`generateBackgroundCss(${dirPath})`, error);
    }
  }

  /**
   * Generate random colors for gradient
   * @param count - Number of colors to generate
   * @returns Array of RGB color objects
   */
  private generateRandomColors(count: number): Array<{ r: number; g: number; b: number }> {
    const colors: Array<{ r: number; g: number; b: number }> = [];
    for (let i = 0; i < count; i++) {
      colors.push({
        r: Math.floor(Math.random() * 156) + 100,
        g: Math.floor(Math.random() * 156) + 100,
        b: Math.floor(Math.random() * 156) + 100
      });
    }
    return colors;
  }

  /**
   * Create CSS string with animated gradient
   * @param colors - Array of RGB colors
   * @param duration - Animation duration in seconds
   * @returns CSS string
   */
  private createGradientCss(
    colors: Array<{ r: number; g: number; b: number }>,
    duration: number
  ): string {
    const colorStrings = colors.map(c => `rgb(${c.r}, ${c.g}, ${c.b})`).join(', ');

    return `body {
    background: linear-gradient(-45deg, ${colorStrings});
    background-size: 400% 400%;
    animation: gradient ${duration}s ease infinite;
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
  }

  /**
   * Delete file
   * @param filePath - Path to file
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.remove(filePath);
      this.log('debug', `Deleted file: ${filePath}`);
    } catch (error) {
      this.handleError(`deleteFile(${filePath})`, error);
    }
  }

  /**
   * Move or rename file
   * @param src - Source file path
   * @param dest - Destination file path
   */
  public async moveFile(src: string, dest: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(dest));
      await fs.move(src, dest);
      this.log('debug', `Moved file: ${src} -> ${dest}`);
    } catch (error) {
      this.handleError(`moveFile(${src}, ${dest})`, error);
    }
  }
}

// Export singleton instance
let fileManagerInstance: FileManagerService | null = null;

/**
 * Get or create the file manager service singleton
 */
export function getFileManagerService(config?: ServiceConfig): FileManagerService {
  if (!fileManagerInstance) {
    fileManagerInstance = new FileManagerService(config);
  }
  return fileManagerInstance;
}

// Export for backward compatibility
export default FileManagerService;
