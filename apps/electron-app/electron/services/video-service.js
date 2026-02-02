"use strict";
/**
 * Video Service
 * Handles video-related operations including metadata extraction, transcoding,
 * thumbnail generation, frame extraction, and optimization for web streaming.
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
exports.VideoService = void 0;
exports.getVideoService = getVideoService;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const services_1 = require("../types/services");
/**
 * Video Service Implementation
 * Provides comprehensive video processing capabilities
 */
class VideoService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'VideoService';
    }
    /**
     * Initialize the video service
     */
    async onInitialize() {
        this.log('info', 'Video service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'Video service disposed');
    }
    /**
     * Get comprehensive video metadata
     * @param filePath - Path to the video file
     * @returns Video metadata including duration, dimensions, codecs
     */
    async getMetadata(filePath) {
        try {
            const metadata = await this.probeFile(filePath);
            const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
            const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
            return {
                duration: Math.round(metadata.format.duration || 0),
                width: videoStream?.width || 0,
                height: videoStream?.height || 0,
                fps: videoStream?.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : 0,
                bitrate: metadata.format.bit_rate || 0,
                format: metadata.format.format_name || 'unknown',
                codec: videoStream?.codec_name,
                hasAudio: !!audioStream,
                audio_codec: audioStream?.codec_name,
                video_codec: videoStream?.codec_name,
                size: metadata.format.size || 0,
            };
        }
        catch (error) {
            this.handleError('getMetadata', error);
        }
    }
    /**
     * Transcode video for compatibility
     * Converts videos to H.264/AAC format for broad compatibility
     * @param inputPath - Path to input video
     * @param outputPath - Optional output path (defaults to cache directory)
     * @returns Path to transcoded video
     */
    async transcode(inputPath, outputPath) {
        try {
            const cacheDir = this.getCacheDir();
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const finalOutputPath = outputPath || path.join(cacheDir, `${fileName}_transcoded.mp4`);
            // Check if transcoded file already exists
            if (await fs.pathExists(finalOutputPath)) {
                this.log('info', `Transcoded video already exists: ${finalOutputPath}`);
                return finalOutputPath;
            }
            // Get duration first
            const metadata = await this.probeFile(inputPath);
            const totalDuration = metadata.format.duration || 0;
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .audioBitrate('128k')
                    .videoFilters('format=yuv420p')
                    .outputOptions(['-preset medium', '-crf 23', '-movflags +faststart'])
                    .on('progress', (progress) => {
                    if (totalDuration > 0) {
                        const currentTime = this.parseTimemark(progress.timemark);
                        const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
                        this.log('debug', `Transcoding progress: ${percent}%`);
                    }
                })
                    .on('end', () => {
                    this.log('info', `Transcoding complete: ${finalOutputPath}`);
                    resolve(finalOutputPath);
                })
                    .on('error', (err) => {
                    this.log('error', `Transcoding error: ${err.message}`);
                    reject(err);
                })
                    .save(finalOutputPath);
            });
        }
        catch (error) {
            this.handleError('transcode', error);
        }
    }
    /**
     * Generate video thumbnail
     * @param videoPath - Path to the video file
     * @param outputPath - Optional output path (defaults to cache directory)
     * @returns Path to generated thumbnail
     */
    async generateThumbnail(videoPath, outputPath) {
        try {
            const cacheDir = this.getCacheDir();
            const thumbnailName = `${(0, uuid_1.v4)()}.png`;
            const thumbnailPath = outputPath || path.join(cacheDir, thumbnailName);
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(videoPath)
                    .screenshots({
                    timestamps: [3],
                    filename: path.basename(thumbnailPath),
                    folder: path.dirname(thumbnailPath),
                    size: '320x240',
                })
                    .on('end', () => {
                    this.log('info', `Thumbnail generated: ${thumbnailPath}`);
                    resolve(thumbnailPath);
                })
                    .on('error', (err) => {
                    this.log('error', `Thumbnail generation error: ${err.message}`);
                    reject(err);
                });
            });
        }
        catch (error) {
            this.handleError('generateThumbnail', error);
        }
    }
    /**
     * Extract video frames at specific intervals
     * @param videoPath - Path to the video file
     * @param intervalSeconds - Interval between frames in seconds
     * @returns Array of frame image paths
     */
    async extractFrames(videoPath, intervalSeconds = 5) {
        try {
            const metadata = await this.getMetadata(videoPath);
            const duration = metadata.duration;
            const frameCount = Math.floor(duration / intervalSeconds);
            const cacheDir = this.getCacheDir();
            const framesDir = path.join(cacheDir, 'frames', (0, uuid_1.v4)());
            await fs.ensureDir(framesDir);
            const timestamps = [];
            for (let i = 0; i < frameCount; i++) {
                timestamps.push(i * intervalSeconds);
            }
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(videoPath)
                    .screenshots({
                    timestamps: timestamps,
                    filename: 'frame_%i.png',
                    folder: framesDir,
                    size: '640x480',
                })
                    .on('end', async () => {
                    const files = await fs.readdir(framesDir);
                    const framePaths = files.map((f) => path.join(framesDir, f));
                    this.log('info', `Extracted ${framePaths.length} frames from video`);
                    resolve(framePaths);
                })
                    .on('error', (err) => {
                    this.log('error', `Frame extraction error: ${err.message}`);
                    reject(err);
                });
            });
        }
        catch (error) {
            this.handleError('extractFrames', error);
        }
    }
    /**
     * Get video duration in seconds
     * @param videoPath - Path to the video file
     * @returns Duration in seconds
     */
    async getVideoDuration(videoPath) {
        try {
            const metadata = await this.getMetadata(videoPath);
            return metadata.duration;
        }
        catch (error) {
            this.handleError('getVideoDuration', error);
        }
    }
    /**
     * Check if video needs transcoding for compatibility
     * @param videoPath - Path to the video file
     * @returns True if transcoding is needed
     */
    async needsTranscoding(videoPath) {
        try {
            const metadata = await this.getMetadata(videoPath);
            // Check if video codec is H.264 and audio is AAC
            const videoCodecOk = metadata.video_codec === 'h264';
            const audioCodecOk = !metadata.audio_codec || metadata.audio_codec === 'aac';
            return !(videoCodecOk && audioCodecOk);
        }
        catch (error) {
            this.log('error', 'Error checking transcode need:', error);
            return true; // Assume transcoding needed on error
        }
    }
    /**
     * Optimize video for web streaming
     * @param inputPath - Path to input video
     * @returns Path to optimized video
     */
    async optimizeForStreaming(inputPath) {
        try {
            const cacheDir = this.getCacheDir();
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(cacheDir, `${fileName}_optimized.mp4`);
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                    '-preset fast',
                    '-crf 22',
                    '-movflags +faststart', // Enable progressive streaming
                    '-pix_fmt yuv420p',
                ])
                    .on('end', () => {
                    this.log('info', `Video optimized for streaming: ${outputPath}`);
                    resolve(outputPath);
                })
                    .on('error', (err) => {
                    this.log('error', `Optimization error: ${err.message}`);
                    reject(err);
                })
                    .save(outputPath);
            });
        }
        catch (error) {
            this.handleError('optimizeForStreaming', error);
        }
    }
    /**
     * Get cache directory for video operations
     * @returns Cache directory path
     */
    getCacheDir() {
        const appData = electron_1.app.getPath('userData');
        const cacheDir = path.join(appData, 'harmonysync', 'cache');
        fs.ensureDirSync(cacheDir);
        return cacheDir;
    }
    /**
     * Parse FFmpeg timemark to seconds
     * @param timemark - Timemark string or number
     * @returns Time in seconds
     */
    parseTimemark(timemark) {
        if (typeof timemark === 'number')
            return timemark;
        if (typeof timemark !== 'string')
            return 0;
        // Format: HH:MM:SS.MS or MM:SS.MS
        const parts = timemark.split(':');
        let seconds = 0;
        if (parts.length === 3) {
            // HH:MM:SS.MS
            seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        }
        else if (parts.length === 2) {
            // MM:SS.MS
            seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        }
        else {
            seconds = parseFloat(timemark);
        }
        return seconds;
    }
    /**
     * Parse frame rate string (e.g., "30/1" to 30)
     * @param frameRate - Frame rate string
     * @returns Frame rate as number
     */
    parseFrameRate(frameRate) {
        if (!frameRate)
            return 0;
        const parts = frameRate.split('/');
        if (parts.length === 2) {
            const numerator = parseInt(parts[0], 10);
            const denominator = parseInt(parts[1], 10);
            return denominator > 0 ? numerator / denominator : 0;
        }
        return parseFloat(frameRate);
    }
    /**
     * Probe file for metadata
     * @param filePath - Path to file
     * @returns Metadata
     */
    async probeFile(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to probe video: ${err.message}`));
                    return;
                }
                resolve(metadata);
            });
        });
    }
}
exports.VideoService = VideoService;
// Export singleton instance
let videoServiceInstance = null;
/**
 * Get or create the video service singleton
 */
function getVideoService(config) {
    if (!videoServiceInstance) {
        videoServiceInstance = new VideoService(config);
    }
    return videoServiceInstance;
}
// Export for backward compatibility
exports.default = VideoService;
