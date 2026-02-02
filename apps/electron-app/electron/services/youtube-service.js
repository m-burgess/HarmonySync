"use strict";
/**
 * YouTube Service
 * Handles YouTube-specific operations including video transcoding for upload,
 * link management, and YouTube-compatible format conversion.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeUtils = exports.YouTubeService = void 0;
exports.createYouTubeService = createYouTubeService;
exports.transcodeForYouTube = transcodeForYouTube;
exports.validateForYouTube = validateForYouTube;
exports.addYouTubeLink = addYouTubeLink;
exports.getYouTubeLinks = getYouTubeLinks;
exports.deleteYouTubeLink = deleteYouTubeLink;
exports.extractYouTubeId = extractYouTubeId;
exports.getYouTubeThumbnailUrl = getYouTubeThumbnailUrl;
exports.isValidYouTubeUrl = isValidYouTubeUrl;
exports.generateEmbedUrl = generateEmbedUrl;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
/**
 * YouTube Service Implementation
 * Handles YouTube video operations and conversions
 */
class YouTubeService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'YouTubeService';
        this.cacheDir = this.getCacheDir();
    }
    /**
     * Initialize the YouTube service
     */
    async onInitialize() {
        await fs.ensureDir(this.cacheDir);
        this.log('info', 'YouTube service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'YouTube service disposed');
    }
    /**
     * Download YouTube video (placeholder - requires external tool)
     * @param _url - YouTube URL
     * @param _outputPath - Output path for downloaded video
     */
    async download(_url, _outputPath) {
        // Note: Actual downloading requires external tools like yt-dlp or youtube-dl
        // This is a placeholder implementation
        this.log('warn', 'YouTube download requires external tools (yt-dlp or youtube-dl)');
        throw new Error('YouTube download not implemented. Use external tools like yt-dlp.');
    }
    /**
     * Get YouTube video information
     * @param url - YouTube URL
     */
    async getInfo(url) {
        try {
            const videoId = this.extractYouTubeId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }
            return {
                videoId,
                embedUrl: this.generateEmbedUrl(videoId),
                thumbnailUrl: this.getYouTubeThumbnailUrl(videoId)
            };
        }
        catch (error) {
            this.handleError('getInfo', error);
        }
    }
    /**
     * Transcode video for YouTube upload
     * Uses YouTube's recommended encoding settings
     * @param inputPath - Path to input video
     * @param progressCallback - Optional progress callback
     * @returns Path to YouTube-ready video
     */
    async transcodeForYouTube(inputPath, progressCallback) {
        return new Promise((resolve, reject) => {
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(this.cacheDir, `${fileName}_youtube.mp4`);
            // Check if already transcoded
            if (fs.existsSync(outputPath)) {
                this.log('info', `YouTube-ready video already exists: ${outputPath}`);
                resolve(outputPath);
                return;
            }
            // Get duration for progress tracking
            fluent_ffmpeg_1.default.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to probe video: ${err.message}`));
                    return;
                }
                const totalDuration = metadata.format.duration || 0;
                // YouTube recommended settings
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .audioBitrate('128k')
                    .audioFrequency(48000) // YouTube prefers 48kHz
                    .videoFilters('format=yuv420p')
                    .outputOptions([
                    '-preset medium',
                    '-crf 23',
                    '-profile:v high',
                    '-level:v 4.0',
                    '-movflags +faststart',
                    '-pix_fmt yuv420p',
                    '-maxrate 10M',
                    '-bufsize 20M'
                ])
                    .on('progress', (progress) => {
                    if (progressCallback && totalDuration > 0) {
                        const currentTime = this.parseTimemark(progress.timemark);
                        const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
                        progressCallback({
                            file_name: fileName,
                            progress: percent,
                            message: `Transcoding for YouTube: ${fileName}...`
                        });
                    }
                })
                    .on('end', () => {
                    this.log('info', `YouTube transcoding complete: ${outputPath}`);
                    resolve(outputPath);
                })
                    .on('error', (err) => {
                    this.log('error', `YouTube transcoding error: ${err.message}`);
                    reject(err);
                })
                    .save(outputPath);
            });
        });
    }
    /**
     * Validate video meets YouTube requirements
     * @param videoPath - Path to the video file
     * @returns Validation result with isValid and issues array
     */
    async validateForYouTube(videoPath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to probe video: ${err.message}`));
                    return;
                }
                const issues = [];
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
                // Check file size (YouTube limit: 256GB, but practical limit much lower)
                const fileSizeMB = (metadata.format.size || 0) / (1024 * 1024);
                if (fileSizeMB > 128000) { // 128GB practical limit
                    issues.push('File size exceeds 128GB');
                }
                // Check duration (YouTube limit: 12 hours for verified accounts)
                const durationHours = (metadata.format.duration || 0) / 3600;
                if (durationHours > 12) {
                    issues.push('Video duration exceeds 12 hours');
                }
                // Check resolution
                if (videoStream) {
                    const width = videoStream.width || 0;
                    const height = videoStream.height || 0;
                    // YouTube supports up to 8K (7680x4320)
                    if (width > 7680 || height > 4320) {
                        issues.push('Resolution exceeds 8K (7680x4320)');
                    }
                }
                // Check video codec
                if (videoStream && !['h264', 'vp9', 'av1'].includes(videoStream.codec_name || '')) {
                    issues.push(`Video codec ${videoStream.codec_name} may not be optimal for YouTube`);
                }
                // Check audio codec
                if (audioStream && !['aac', 'mp3', 'vorbis', 'opus'].includes(audioStream.codec_name || '')) {
                    issues.push(`Audio codec ${audioStream.codec_name} may not be optimal for YouTube`);
                }
                resolve({
                    isValid: issues.length === 0,
                    issues: issues,
                    metadata: {
                        duration: metadata.format.duration || 0,
                        size: fileSizeMB,
                        videoCodec: videoStream?.codec_name,
                        audioCodec: audioStream?.codec_name,
                        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'N/A'
                    }
                });
            });
        });
    }
    /**
     * Extract YouTube video ID from URL
     * @param url - YouTube URL
     * @returns YouTube video ID or null
     */
    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    /**
     * Get YouTube video thumbnail URL
     * @param videoIdOrUrl - YouTube video ID or URL
     * @param quality - Thumbnail quality: 'default', 'medium', 'high', 'standard', 'maxres'
     * @returns Thumbnail URL
     */
    getYouTubeThumbnailUrl(videoIdOrUrl, quality = 'high') {
        const videoId = this.extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
        const qualityMap = {
            'default': 'default.jpg',
            'medium': 'mqdefault.jpg',
            'high': 'hqdefault.jpg',
            'standard': 'sddefault.jpg',
            'maxres': 'maxresdefault.jpg'
        };
        const filename = qualityMap[quality] || qualityMap['high'];
        return `https://img.youtube.com/vi/${videoId}/${filename}`;
    }
    /**
     * Validate YouTube URL
     * @param url - URL to validate
     * @returns True if valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        return this.extractYouTubeId(url) !== null;
    }
    /**
     * Generate YouTube embed URL
     * @param videoIdOrUrl - YouTube video ID or URL
     * @param options - Embed options (autoplay, loop, controls, etc.)
     * @returns YouTube embed URL
     */
    generateEmbedUrl(videoIdOrUrl, options = {}) {
        const videoId = this.extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
        const params = new URLSearchParams();
        if (options.autoplay)
            params.append('autoplay', '1');
        if (options.loop) {
            params.append('loop', '1');
            params.append('playlist', videoId); // Required for loop
        }
        if (options.controls === false)
            params.append('controls', '0');
        if (options.mute)
            params.append('mute', '1');
        if (options.start)
            params.append('start', options.start.toString());
        if (options.end)
            params.append('end', options.end.toString());
        const queryString = params.toString();
        return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
    }
    /**
     * Get cache directory for YouTube operations
     */
    getCacheDir() {
        const appData = electron_1.app.getPath('userData');
        const cacheDir = path.join(appData, 'harmonysync', 'cache', 'youtube');
        return cacheDir;
    }
    /**
     * Parse FFmpeg timemark to seconds
     */
    parseTimemark(timemark) {
        if (typeof timemark === 'number')
            return timemark;
        if (typeof timemark !== 'string')
            return 0;
        const parts = timemark.split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        }
        else if (parts.length === 2) {
            seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        }
        else {
            seconds = parseFloat(timemark);
        }
        return seconds;
    }
    /**
     * @deprecated Use jsonStorage.addYouTubeLink() directly
     */
    async addYouTubeLink(_unusedDb, _presentationPath, _url) {
        this.log('warn', 'addYouTubeLink is deprecated. Use jsonStorage.addYouTubeLink() instead.');
        throw new Error('youtube-service.addYouTubeLink is deprecated. Use jsonStorage.addYouTubeLink() instead.');
    }
    /**
     * @deprecated Use jsonStorage.getYouTubeLinks() directly
     */
    async getYouTubeLinks(_unusedDb, _presentationPath) {
        this.log('warn', 'getYouTubeLinks is deprecated. Use jsonStorage.getYouTubeLinks() instead.');
        throw new Error('youtube-service.getYouTubeLinks is deprecated. Use jsonStorage.getYouTubeLinks() instead.');
    }
    /**
     * @deprecated Use jsonStorage.deleteYouTubeLink() directly
     */
    async deleteYouTubeLink(_unusedDb, _presentationPath, _url) {
        this.log('warn', 'deleteYouTubeLink is deprecated. Use jsonStorage.deleteYouTubeLink() instead.');
        throw new Error('youtube-service.deleteYouTubeLink is deprecated. Use jsonStorage.deleteYouTubeLink() instead.');
    }
}
exports.YouTubeService = YouTubeService;
// Export for backward compatibility
function createYouTubeService(config) {
    return new YouTubeService(config);
}
// Singleton instance for backward compatibility
const defaultInstance = new YouTubeService();
// Export function-based API for backward compatibility
async function transcodeForYouTube(inputPath, progressCallback) {
    return defaultInstance.transcodeForYouTube(inputPath, progressCallback);
}
async function validateForYouTube(videoPath) {
    return defaultInstance.validateForYouTube(videoPath);
}
async function addYouTubeLink(_unusedDb, _presentationPath, _url) {
    return defaultInstance.addYouTubeLink(_unusedDb, _presentationPath, _url);
}
async function getYouTubeLinks(_unusedDb, _presentationPath) {
    return defaultInstance.getYouTubeLinks(_unusedDb, _presentationPath);
}
async function deleteYouTubeLink(_unusedDb, _presentationPath, _url) {
    return defaultInstance.deleteYouTubeLink(_unusedDb, _presentationPath, _url);
}
function extractYouTubeId(url) {
    return defaultInstance.extractYouTubeId(url);
}
function getYouTubeThumbnailUrl(videoIdOrUrl, quality) {
    return defaultInstance.getYouTubeThumbnailUrl(videoIdOrUrl, quality);
}
function isValidYouTubeUrl(url) {
    return defaultInstance.isValidYouTubeUrl(url);
}
function generateEmbedUrl(videoIdOrUrl, options) {
    return defaultInstance.generateEmbedUrl(videoIdOrUrl, options);
}
// Export utility functions for standalone use (kept for convenience)
exports.youtubeUtils = {
    extractYouTubeId,
    getYouTubeThumbnailUrl,
    isValidYouTubeUrl,
    generateEmbedUrl
};
