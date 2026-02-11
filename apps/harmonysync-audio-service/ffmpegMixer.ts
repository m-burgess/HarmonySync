/**
 * FFmpeg-based mixer for synchronized multitrack playback
 * Uses a single ffmpeg process with complex filter to eliminate drift
 */

import { spawn, spawnSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface TrackInput {
    filePath: string;
    volume: number;
    pan: number;
    isMuted: boolean;
    name: string;
}

export class FFmpegMixer {
    private process: ChildProcess | null = null;
    private isPlaying: boolean = false;
    private static cachedOutputDevices: Set<string> | null = null;
    private static cachedOutputFormats: Set<string> | null = null;
    private static cachedFfmpegPath: string | null = null;

    /**
     * Build ffmpeg filter graph for mixing multiple tracks
     * Each track gets volume and pan filters, then all mixed together
     */
    private buildFilterComplex(tracks: TrackInput[]): string {
        const filters: string[] = [];
        const mixInputs: string[] = [];

        tracks.forEach((track, index) => {
            // Volume filter (or silent if muted)
            const volume = track.isMuted ? 0 : track.volume;
            
            // Pan filter using constant power panning
            const clampedPan = Math.max(-1, Math.min(1, track.pan));
            const angle = ((clampedPan + 1) * Math.PI) / 4; // 0 to pi/2
            const leftGain = Math.cos(angle);
            const rightGain = Math.sin(angle);
            
            // Build filter chain for this track: volume -> pan
            const volumeFilter = `[${index}:a]volume=${volume}`;
            const panFilter = `pan=stereo|c0=${leftGain.toFixed(4)}*c0|c1=${rightGain.toFixed(4)}*c1`;
            
            // Combined filter for this track
            const trackLabel = `t${index}`;
            filters.push(`${volumeFilter},${panFilter}[${trackLabel}]`);
            mixInputs.push(`[${trackLabel}]`);
        });

        // Mix all tracks together
        const mixFilter = `${mixInputs.join('')}amix=inputs=${tracks.length}:duration=longest:dropout_transition=0[out]`;
        filters.push(mixFilter);

        return filters.join(';');
    }

    /**
     * Start synchronized playback of multiple tracks using single ffmpeg process
     */
    async startMixedPlayback(tracks: TrackInput[]): Promise<boolean> {
        if (this.isPlaying) {
            console.warn('FFmpegMixer: Already playing, stop first');
            return false;
        }

        if (!FFmpegMixer.hasSupportedOutput()) {
            console.warn('FFmpegMixer: No supported audio output devices found');
            return false;
        }

        if (tracks.length === 0) {
            console.warn('FFmpegMixer: No tracks to play');
            return false;
        }

        try {
            // Build ffmpeg command
            const args: string[] = [];

            // Add all input files
            tracks.forEach(track => {
                args.push('-i', track.filePath);
            });

            // Add filter complex for mixing
            const filterComplex = this.buildFilterComplex(tracks);
            args.push('-filter_complex', filterComplex);

            // Map the output
            args.push('-map', '[out]');

            // Output to audio device
            const output = this.getAudioOutput();
            args.push('-f', output.format);
            args.push(output.device);

            const ffmpegPath = FFmpegMixer.getFfmpegPath();

            console.log(`🎵 FFmpegMixer: Starting synchronized playback (${ffmpegPath})`);
            console.log(`   Tracks: ${tracks.length}`);
            console.log(`   Command: ${ffmpegPath} ${args.join(' ')}`);

            // Spawn ffmpeg process
            this.process = spawn(ffmpegPath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.isPlaying = true;

            // Handle process events
            this.process.on('close', (code) => {
                console.log(`🎵 FFmpegMixer: Playback ended (code: ${code})`);
                this.isPlaying = false;
                this.process = null;
            });

            this.process.on('error', (error) => {
                console.error('❌ FFmpegMixer: Process error:', error);
                this.isPlaying = false;
                this.process = null;
            });

            // Log stderr for debugging
            this.process.stderr?.on('data', (data) => {
                const message = data.toString();
                // Only log important messages, not progress
                if (!message.includes('time=') && !message.includes('bitrate=')) {
                    console.log('FFmpegMixer:', message.trim());
                }
            });

            return true;
        } catch (error) {
            console.error('❌ FFmpegMixer: Failed to start playback:', error);
            this.isPlaying = false;
            return false;
        }
    }

    /**
     * Stop playback
     */
    stop(): void {
        if (this.process) {
            console.log('🛑 FFmpegMixer: Stopping playback');
            this.process.kill('SIGTERM');
            this.process = null;
        }
        this.isPlaying = false;
    }

    /**
     * Check if currently playing
     */
    isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get the appropriate audio format for the platform
     */
    private getAudioOutput(): { format: string; device: string } {
        const platform = process.platform;
        const availableFormats = FFmpegMixer.getAvailableOutputFormats();
        const preferredFormats = this.getPreferredFormats(platform);

        const format = preferredFormats.find(candidate => availableFormats.has(candidate));
        if (!format) {
            throw new Error('FFmpegMixer: No supported audio output formats found');
        }
        const device = this.getAudioDeviceForFormat(platform, format);
        console.log(`FFmpegMixer: Available outputs: ${Array.from(availableFormats).join(', ') || 'none'}`);
        console.log(`FFmpegMixer: Selected output: ${format} ${device}`);

        return { format, device };
    }

    static hasSupportedOutput(platform: NodeJS.Platform = process.platform): boolean {
        const availableFormats = FFmpegMixer.getAvailableOutputFormats();
        const preferredFormats = platform === 'darwin'
            ? ['coreaudio']
            : platform === 'linux'
                ? ['pulse', 'alsa']
                : platform === 'win32'
                    ? ['wasapi', 'dshow']
                    : ['alsa'];

        return preferredFormats.some(format => availableFormats.has(format));
    }

    private getPreferredFormats(platform: NodeJS.Platform): string[] {
        if (platform === 'darwin') return ['coreaudio'];
        if (platform === 'linux') return ['pulse', 'alsa'];
        if (platform === 'win32') return ['wasapi', 'dshow'];
        return ['alsa'];
    }

    private getAudioDeviceForFormat(platform: NodeJS.Platform, format: string): string {
        if (platform === 'darwin') return '-';
        if (platform === 'linux') return 'default';
        if (platform === 'win32') {
            // Windows: use default device unless explicitly configured.
            return process.env.HARMONYSYNC_AUDIO_DEVICE || (format === 'dshow' ? 'audio' : 'default');
        }
        return 'default';
    }

    private static getAvailableOutputFormats(): Set<string> {
        if (FFmpegMixer.cachedOutputDevices) return FFmpegMixer.cachedOutputDevices;

        const deviceFormats = FFmpegMixer.getAvailableOutputDevices();
        if (deviceFormats.size > 0) {
            FFmpegMixer.cachedOutputDevices = deviceFormats;
            return deviceFormats;
        }

        if (FFmpegMixer.cachedOutputFormats) return FFmpegMixer.cachedOutputFormats;
        try {
            const output = FFmpegMixer.runFfmpegCommand(['-formats']);
            const formats = new Set<string>();
            const lines = output.split(/\r?\n/);
            for (const line of lines) {
                const match = line.match(/^\s*[D\.][E\.]\s+([A-Za-z0-9_]+)/);
                if (match) formats.add(match[1].toLowerCase());
            }
            FFmpegMixer.cachedOutputFormats = formats;
            return formats;
        } catch {
            FFmpegMixer.cachedOutputFormats = new Set<string>();
            return FFmpegMixer.cachedOutputFormats;
        }
    }

    private static getAvailableOutputDevices(): Set<string> {
        try {
            const output = FFmpegMixer.runFfmpegCommand(['-devices']);
            const devices = new Set<string>();
            const lines = output.split(/\r?\n/);
            for (const line of lines) {
                const match = line.match(/^\s*([D\.])([E\.])\s+([A-Za-z0-9_]+)/);
                if (match && match[2] === 'E') {
                    devices.add(match[3].toLowerCase());
                }
            }
            return devices;
        } catch {
            return new Set<string>();
        }
    }

    /**
     * Check if mixer is available (ffmpeg installed)
     */
    static isAvailable(): boolean {
        try {
            const ffmpegPath = FFmpegMixer.getFfmpegPath();
            FFmpegMixer.runFfmpegCommand(['-version']);
            const outputs = Array.from(FFmpegMixer.getAvailableOutputFormats());
            console.log(`FFmpegMixer: Using ffmpeg at ${ffmpegPath}`);
            console.log(`FFmpegMixer: Detected outputs: ${outputs.join(', ') || 'none'}`);
            return true;
        } catch {
            return false;
        }
    }

    private static runFfmpegCommand(args: string[]): string {
        const ffmpegPath = FFmpegMixer.getFfmpegPath();
        const result = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
        return `${result.stdout ?? ''}${result.stderr ?? ''}`;
    }

    private static getFfmpegPath(): string {
        if (FFmpegMixer.cachedFfmpegPath) return FFmpegMixer.cachedFfmpegPath;

        const envPath = process.env.HARMONYSYNC_FFMPEG_PATH || process.env.FFMPEG_PATH;
        const executableName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const candidates: string[] = [];
        const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;

        if (envPath) candidates.push(envPath);
        if (resourcesPath) {
            candidates.push(path.join(resourcesPath, 'ffmpeg', executableName));
        }
        candidates.push(path.join(process.cwd(), 'apps', 'harmonysync-audio-service', 'bin', executableName));
        candidates.push(path.join(process.cwd(), 'bin', executableName));
        candidates.push(executableName);

        for (const candidate of candidates) {
            if (candidate === executableName) {
                FFmpegMixer.cachedFfmpegPath = candidate;
                return candidate;
            }
            if (fs.existsSync(candidate)) {
                FFmpegMixer.cachedFfmpegPath = candidate;
                return candidate;
            }
        }

        FFmpegMixer.cachedFfmpegPath = executableName;
        return executableName;
    }
}

export default FFmpegMixer;
