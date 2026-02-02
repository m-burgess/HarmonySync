"use strict";
/**
 * Audio Service
 * Handles all audio-related operations including format conversion,
 * transposition, and synchronization checks using FFmpeg.
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
exports.AudioService = void 0;
exports.getAudioService = getAudioService;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
// ==================== Audio Service Class ====================
/**
 * AudioService - Manages audio operations using FFmpeg
 * Extends BaseElectronService for consistent service behavior
 */
class AudioService extends services_1.BaseElectronService {
    constructor() {
        super(...arguments);
        this.serviceName = 'AudioService';
        this.cacheDir = '';
    }
    /**
     * Initialize the audio service
     */
    async onInitialize() {
        this.cacheDir = this.getCacheDir();
        this.log('info', `Cache directory: ${this.cacheDir}`);
    }
    /**
     * Clean up resources
     */
    onDispose() {
        // No specific cleanup needed for audio service
    }
    // ==================== Private Helper Methods ====================
    /**
     * Get cache directory for audio operations
     */
    getCacheDir() {
        const appData = electron_1.app.getPath('userData');
        const cacheDir = path.join(appData, 'harmonysync', 'cache', 'audio');
        fs.ensureDirSync(cacheDir);
        return cacheDir;
    }
    /**
     * Parse FFmpeg timemark to seconds
     */
    parseTimemark(timemark) {
        if (typeof timemark === 'number') {
            return timemark;
        }
        if (typeof timemark !== 'string') {
            return 0;
        }
        const parts = timemark.split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parseInt(parts[0], 10) * 3600 +
                parseInt(parts[1], 10) * 60 +
                parseFloat(parts[2]);
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
     * Probe audio file metadata using FFprobe
     */
    async probeFile(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to probe file: ${err.message}`));
                }
                else {
                    resolve(metadata);
                }
            });
        });
    }
    // ==================== Public API Methods ====================
    /**
     * Convert audio file to Ogg format
     * @param inputPath - Path to input audio file
     * @param outputDir - Output directory path
     * @param progressCallback - Optional progress callback
     * @returns Path to converted file
     */
    async convertToOgg(inputPath, outputDir, progressCallback) {
        this.ensureInitialized();
        try {
            await fs.ensureDir(outputDir);
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(outputDir, `${fileName}.ogg`);
            // Get duration first
            const metadata = await this.probeFile(inputPath);
            const totalDuration = metadata.format.duration || 0;
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .audioCodec('libvorbis')
                    .audioBitrate('128k')
                    .audioQuality(4)
                    .on('progress', (progress) => {
                    if (progressCallback && totalDuration > 0) {
                        const currentTime = this.parseTimemark(progress.timemark);
                        const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
                        progressCallback({
                            percent,
                            currentTime,
                            totalTime: totalDuration,
                            message: `Converting ${fileName}...`
                        });
                    }
                })
                    .on('end', () => {
                    this.log('info', `Conversion complete: ${outputPath}`);
                    resolve(outputPath);
                })
                    .on('error', (err) => {
                    this.log('error', `Conversion error: ${err.message}`);
                    reject(err);
                })
                    .save(outputPath);
            });
        }
        catch (error) {
            return this.handleError('convertToOgg', error);
        }
    }
    /**
     * Transpose audio files in a directory
     * @param songPath - Path to song directory
     * @param semitones - Number of semitones to transpose (positive or negative)
     * @param progressCallback - Optional progress callback
     * @returns Object with outputDir and tracks array
     */
    async transposeAudio(songPath, semitones, progressCallback) {
        this.ensureInitialized();
        try {
            const transposedFolderName = semitones > 0
                ? `transposed_up_${semitones}`
                : `transposed_down_${Math.abs(semitones)}`;
            const outputDir = path.join(songPath, transposedFolderName);
            await fs.ensureDir(outputDir);
            // Get all audio files from the song directory
            const files = await fs.readdir(songPath);
            const audioFiles = files.filter(f => {
                const ext = path.extname(f).toLowerCase();
                return ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext);
            });
            const transposedTracks = [];
            const rhythmSectionNames = ['guide', 'click', 'drums', 'percussion', 'shakers'];
            for (const audioFile of audioFiles) {
                const inputPath = path.join(songPath, audioFile);
                const baseName = path.basename(audioFile, path.extname(audioFile));
                const outputPath = path.join(outputDir, audioFile);
                // Check if this is a rhythm section track (don't transpose)
                const isRhythmSection = rhythmSectionNames.some(name => baseName.toLowerCase().includes(name));
                if (isRhythmSection) {
                    // Just copy the file without transposition
                    await fs.copy(inputPath, outputPath);
                    this.log('info', `Copied rhythm section track: ${baseName}`);
                }
                else {
                    // Transpose the audio
                    await new Promise((resolve, reject) => {
                        const asetrate = 44100 * Math.pow(2, semitones / 12);
                        (0, fluent_ffmpeg_1.default)(inputPath)
                            .audioFilters([
                            `asetrate=${asetrate}`,
                            'aresample=44100'
                        ])
                            .audioCodec('copy')
                            .on('end', () => {
                            this.log('info', `Transposed: ${baseName} by ${semitones} semitones`);
                            resolve();
                        })
                            .on('error', (err) => {
                            this.log('error', `Error transposing ${baseName}:`, err);
                            reject(err);
                        })
                            .save(outputPath);
                    });
                }
                transposedTracks.push({
                    name: baseName,
                    filePath: outputPath
                });
            }
            if (progressCallback) {
                progressCallback(transposedTracks);
            }
            return {
                outputDir,
                tracks: transposedTracks
            };
        }
        catch (error) {
            return this.handleError('transposeAudio', error);
        }
    }
    /**
     * Ensure audio files are synchronized
     * @param audioFiles - Array of audio file paths
     * @returns Sync status object
     */
    async ensureAudioSync(audioFiles) {
        this.ensureInitialized();
        try {
            const metadata = [];
            for (const file of audioFiles) {
                const meta = await this.probeFile(file);
                metadata.push(meta);
            }
            // Check if all files have the same duration (within 0.1 seconds)
            const durations = metadata.map(m => m.format.duration || 0);
            const maxDuration = Math.max(...durations);
            const minDuration = Math.min(...durations);
            if (maxDuration - minDuration > 0.1) {
                this.log('warn', 'Audio files have different durations, sync may be affected');
                return { synced: false, message: 'Duration mismatch detected' };
            }
            // Check sample rates
            const sampleRates = metadata.map(m => {
                const audioStream = m.streams.find(s => s.codec_type === 'audio');
                return audioStream?.sample_rate;
            });
            const uniqueSampleRates = [...new Set(sampleRates)];
            if (uniqueSampleRates.length > 1) {
                this.log('warn', 'Audio files have different sample rates');
                return { synced: false, message: 'Sample rate mismatch detected' };
            }
            return { synced: true, message: 'All audio files are synced' };
        }
        catch (error) {
            return this.handleError('ensureAudioSync', error);
        }
    }
    /**
     * Get audio file metadata
     * @param audioPath - Path to audio file
     * @returns Audio metadata
     */
    async getAudioMetadata(audioPath) {
        this.ensureInitialized();
        try {
            const metadata = await this.probeFile(audioPath);
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
            return {
                duration: Math.round(metadata.format.duration || 0),
                codec: audioStream?.codec_name,
                sample_rate: audioStream?.sample_rate,
                channels: audioStream?.channels,
                bit_rate: metadata.format.bit_rate,
                size: metadata.format.size
            };
        }
        catch (error) {
            return this.handleError('getAudioMetadata', error);
        }
    }
    /**
     * Normalize audio levels
     * @param inputPath - Path to input audio file
     * @param targetLevel - Target level in dB (default: -23)
     * @returns Path to normalized file
     */
    async normalizeAudio(inputPath, targetLevel = -23) {
        this.ensureInitialized();
        try {
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(this.cacheDir, `${fileName}_normalized.mp3`);
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .audioFilters(`loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`)
                    .audioCodec('libmp3lame')
                    .audioBitrate('192k')
                    .on('end', () => {
                    this.log('info', `Audio normalized: ${outputPath}`);
                    resolve(outputPath);
                })
                    .on('error', (err) => {
                    this.log('error', `Normalization error: ${err.message}`);
                    reject(err);
                })
                    .save(outputPath);
            });
        }
        catch (error) {
            return this.handleError('normalizeAudio', error);
        }
    }
}
exports.AudioService = AudioService;
// ==================== Default Export ====================
/**
 * Create and export a singleton instance
 */
let audioServiceInstance = null;
function getAudioService() {
    if (!audioServiceInstance) {
        audioServiceInstance = new AudioService();
    }
    return audioServiceInstance;
}
exports.default = AudioService;
