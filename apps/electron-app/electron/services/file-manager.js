"use strict";
/**
 * File Manager Service
 * Handles file system operations with a clean OOP interface
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagerService = void 0;
exports.getFileManagerService = getFileManagerService;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const services_1 = require("../types/services");
/**
 * File Manager Service Implementation
 * Provides file system operations with proper error handling and logging
 */
class FileManagerService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'FileManagerService';
    }
    /**
     * Initialize the file manager service
     */
    async onInitialize() {
        this.log('info', 'File manager service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'File manager service disposed');
    }
    /**
     * Read file contents
     * @param filePath - Path to file
     * @returns File content as string
     */
    async readFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            this.log('debug', `Read file: ${filePath}`);
            return content;
        }
        catch (error) {
            this.handleError(`readFile(${filePath})`, error);
        }
    }
    /**
     * Write file contents
     * @param filePath - Path to file
     * @param content - Content to write
     */
    async writeFile(filePath, content) {
        try {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, 'utf8');
            this.log('debug', `Wrote file: ${filePath}`);
        }
        catch (error) {
            this.handleError(`writeFile(${filePath})`, error);
        }
    }
    /**
     * Read directory contents
     * @param dirPath - Path to directory
     * @returns Array of directory entries
     */
    async readDir(dirPath) {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            const entries = files.map(file => file.name);
            this.log('debug', `Read directory: ${dirPath}, found ${entries.length} entries`);
            return entries;
        }
        catch (error) {
            this.handleError(`readDir(${dirPath})`, error);
        }
    }
    /**
     * Read directory with detailed file information
     * @param dirPath - Path to directory
     * @returns Array of directory entries with detailed information
     */
    async readDirDetailed(dirPath) {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            const entries = await Promise.all(files.map(async (file) => {
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
            }));
            this.log('debug', `Read directory (detailed): ${dirPath}, found ${entries.length} entries`);
            return entries;
        }
        catch (error) {
            this.handleError(`readDirDetailed(${dirPath})`, error);
        }
    }
    /**
     * Check if file or directory exists
     * @param filePath - Path to check
     * @returns True if exists, false otherwise
     */
    async exists(filePath) {
        try {
            return await fs.pathExists(filePath);
        }
        catch (error) {
            this.log('warn', `Error checking existence of ${filePath}:`, error);
            return false;
        }
    }
    /**
     * Create directory (and parent directories if needed)
     * @param dirPath - Path to directory
     */
    async mkdir(dirPath) {
        try {
            await fs.ensureDir(dirPath);
            this.log('debug', `Created directory: ${dirPath}`);
        }
        catch (error) {
            this.handleError(`mkdir(${dirPath})`, error);
        }
    }
    /**
     * Copy file to destination
     * @param src - Source file path
     * @param dest - Destination file path
     */
    async copyFile(src, dest) {
        try {
            await fs.ensureDir(path.dirname(dest));
            await fs.copy(src, dest);
            this.log('debug', `Copied file: ${src} -> ${dest}`);
        }
        catch (error) {
            this.handleError(`copyFile(${src}, ${dest})`, error);
        }
    }
    /**
     * Generate or retrieve background CSS with animated gradient
     * @param dirPath - Directory path where CSS will be stored
     * @param options - Optional customization options
     * @returns Generated CSS content
     */
    async generateBackgroundCss(dirPath, options) {
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
        }
        catch (error) {
            this.handleError(`generateBackgroundCss(${dirPath})`, error);
        }
    }
    /**
     * Generate random colors for gradient
     * @param count - Number of colors to generate
     * @returns Array of RGB color objects
     */
    generateRandomColors(count) {
        const colors = [];
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
    createGradientCss(colors, duration) {
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
    async deleteFile(filePath) {
        try {
            await fs.remove(filePath);
            this.log('debug', `Deleted file: ${filePath}`);
        }
        catch (error) {
            this.handleError(`deleteFile(${filePath})`, error);
        }
    }
    /**
     * Move or rename file
     * @param src - Source file path
     * @param dest - Destination file path
     */
    async moveFile(src, dest) {
        try {
            await fs.ensureDir(path.dirname(dest));
            await fs.move(src, dest);
            this.log('debug', `Moved file: ${src} -> ${dest}`);
        }
        catch (error) {
            this.handleError(`moveFile(${src}, ${dest})`, error);
        }
    }
}
exports.FileManagerService = FileManagerService;
// Export singleton instance
let fileManagerInstance = null;
/**
 * Get or create the file manager service singleton
 */
function getFileManagerService(config) {
    if (!fileManagerInstance) {
        fileManagerInstance = new FileManagerService(config);
    }
    return fileManagerInstance;
}
// Export for backward compatibility
exports.default = FileManagerService;
