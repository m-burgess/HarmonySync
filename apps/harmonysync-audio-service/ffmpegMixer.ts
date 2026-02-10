/**
 * FFmpeg-based mixer for synchronized multitrack playback
 * Uses a single ffmpeg process with complex filter to eliminate drift
 */

import { spawn, ChildProcess } from 'child_process';

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
            args.push('-f', this.getAudioFormat());
            args.push(this.getAudioDevice());

            console.log('🎵 FFmpegMixer: Starting synchronized playback');
            console.log(`   Tracks: ${tracks.length}`);
            console.log(`   Command: ffmpeg ${args.join(' ')}`);

            // Spawn ffmpeg process
            this.process = spawn('ffmpeg', args, {
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
    private getAudioFormat(): string {
        const platform = process.platform;
        if (platform === 'darwin') return 'coreaudio';
        if (platform === 'linux') return 'alsa';
        if (platform === 'win32') return 'dshow';
        return 'alsa'; // fallback
    }

    /**
     * Get the appropriate audio device for the platform
     */
    private getAudioDevice(): string {
        const platform = process.platform;
        if (platform === 'darwin') return '-'; // default device
        if (platform === 'linux') return 'default';
        if (platform === 'win32') return 'audio="@device_cm_{33D9A762-90C8-11D0-BD43-00A0C911CE86}\\wave_{YOUR-DEVICE-ID}"';
        return 'default'; // fallback
    }

    /**
     * Update track volume without restarting (not supported with this approach)
     * Would need to restart playback with new parameters
     */
    async updateVolume(trackIndex: number, volume: number): Promise<boolean> {
        console.warn('FFmpegMixer: Dynamic volume updates require restart');
        return false;
    }
}

export default FFmpegMixer;
