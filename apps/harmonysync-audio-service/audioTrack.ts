import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFile, IAudioMetadata } from 'music-metadata';
import wav from 'node-wav';
import { ChildProcess } from 'child_process';

// Lazy-load Audic (ESM) to avoid importing it at module evaluation time
let AudicClass: any = null;
export function getAudic(): any | null {
    if (!AudicClass) {
        try {
            const AudicModule = require('audic');
            AudicClass = AudicModule && (AudicModule.default || AudicModule);
        } catch (e) {
            AudicClass = null;
        }
    }
    return AudicClass;
}

export interface AudicInstance {
    play(): void;
    destroy(): void;
    volume: number;
    on(event: 'ended' | 'error', callback: (error?: Error) => void): void;
}

export interface AudioTrackState {
    id: string;
    name: string;
    filePath: string;
    duration: number;
    channels: number;
    sampleRate: number;
    volume: number;
    pan: number;
    isMuted: boolean;
    isPlaying: boolean;
    currentPosition: number;
}

export interface WavDecodeResult {
    channelData: Float32Array[];
    sampleRate: number;
}

export class AudioTrack {
    public id: string;
    public name: string;
    public filePath: string;
    public duration: number;
    public channels: number;
    public sampleRate: number;
    public volume: number;
    public pan: number;
    public isMuted: boolean;
    public isPlaying: boolean;
    public currentPosition: number;
    public stream: fs.ReadStream | null;
    public decoder: any | null;
    public audioProcess: ChildProcess | null;
    public audic: AudicInstance | null;
    public tempFilePath: string | null;
    public originalVolume?: number;

    constructor(
        id: string,
        name: string,
        filePath: string,
        duration: number,
        channels: number,
        sampleRate: number
    ) {
        this.id = id;
        this.name = name;
        this.filePath = filePath;
        this.duration = duration;
        this.channels = channels;
        this.sampleRate = sampleRate;
        this.volume = 1.0;
        this.pan = 0.0; // -1.0 (left) to 1.0 (right)
        this.isMuted = false;
        this.isPlaying = false;
        this.currentPosition = 0;
        this.stream = null;
        this.decoder = null;
        this.audioProcess = null;
        this.audic = null;
        this.tempFilePath = null;
    }

    async loadMetadata(): Promise<boolean> {
        try {
            const metadata: IAudioMetadata = await parseFile(this.filePath);
            this.duration = metadata.format.duration || 0;
            this.channels = metadata.format.numberOfChannels || 2;
            this.sampleRate = metadata.format.sampleRate || 44100;
            return true;
        } catch (error) {
            console.error(`Failed to load metadata for ${this.filePath}:`, error);
            return false;
        }
    }

    createStream(): fs.ReadStream {
        if (this.stream) {
            this.stream.destroy();
        }

        // Create a streaming reader for the audio file
        this.stream = fs.createReadStream(this.filePath);
        return this.stream;
    }

    play(): void {
        console.log(`⚠️  Warning: Individual track play() called for ${this.name}. Use mixer.playAllTracks() for synchronized playback.`);

        if (this.isPlaying) return;

        this.isPlaying = true;
        console.log(`▶️  Playing individual track: ${this.name}`);

        try {
            // Clean up any existing audic instance
            if (this.audic) {
                try {
                    this.audic.destroy();
                } catch (error) {
                    console.error(`⚠️ Error cleaning up existing audic for ${this.name}:`, error);
                }
                this.audic = null;
            }

            // Clean up any existing temp file
            if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
                try {
                    fs.unlinkSync(this.tempFilePath);
                } catch (error) {
                    console.error(`⚠️ Error cleaning up existing temp file for ${this.name}:`, error);
                }
                this.tempFilePath = null;
            }

            // Determine pan based on track type
            const isClickOrGuide = this.name.toLowerCase().includes('click') ||
                this.name.toLowerCase().includes('guide') ||
                this.name.toLowerCase().includes('metronome');
            const pan = isClickOrGuide ? -1 : 1; // -1 = full left, 1 = full right

            // Update track's pan value for UI consistency
            this.pan = pan;

            // Decode WAV file
            const buffer: Buffer = fs.readFileSync(this.filePath);
            const result: WavDecodeResult = wav.decode(buffer) as WavDecodeResult;

            // Apply constant power panning
            if (result.channelData.length >= 2) { // Stereo
                const leftChannel: Float32Array = result.channelData[0];
                const rightChannel: Float32Array = result.channelData[1];

                // Constant power panning formula
                const angle: number = ((pan + 1) * Math.PI) / 4; // 0 to π/2
                const leftGain: number = Math.cos(angle);
                const rightGain: number = Math.sin(angle);

                for (let i = 0; i < leftChannel.length; i++) {
                    const sample: number = leftChannel[i];
                    leftChannel[i] = sample * leftGain;
                    rightChannel[i] = sample * rightGain;
                }
            }

            // Encode back to WAV buffer
            const pannedBuffer: Buffer = wav.encode(result.channelData, {
                sampleRate: result.sampleRate,
                bitDepth: 16
            });

            // Save to temporary file
            const tempDir: string = os.tmpdir();
            const tempFileName: string = `harmony_${this.id}_${Date.now()}.wav`;
            const tempFilePath: string = path.join(tempDir, tempFileName);
            fs.writeFileSync(tempFilePath, Buffer.from(pannedBuffer));

            // Store temp file path for cleanup
            this.tempFilePath = tempFilePath;

            // Play with audic (lazy-loaded)
            const AudicCtor = getAudic();
            if (AudicCtor) {
                this.audic = new AudicCtor(tempFilePath) as AudicInstance;
                this.audic.volume = this.isMuted ? 0 : this.volume;
            } else {
                this.audic = null;
                console.warn('Audic not available; skipping audio playback in this environment');
            }

            console.log(`▶️ Starting individual track: ${this.name} (pan: ${pan})`);
            if (this.audic) {
                this.audic.play();
            }

            if (this.audic) {
                this.audic.on('ended', () => {
                    console.log(`🏁 Track finished: ${this.name}`);
                    this.isPlaying = false;

                    // Clean up temp file
                    if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
                        try {
                            fs.unlinkSync(this.tempFilePath);
                            console.log(`🗑️ Cleaned up temp file: ${this.tempFilePath}`);
                        } catch (error) {
                            console.error(`❌ Failed to clean up temp file ${this.tempFilePath}:`, error);
                        }
                    }

                    if (this.audic) {
                        this.audic.destroy();
                        this.audic = null;
                    }
                    this.tempFilePath = null;
                });

                this.audic.on('error', (error?: Error) => {
                    console.error(`❌ Audio playback error for ${this.name}:`, error);
                    this.isPlaying = false;

                    // Clean up temp file on error
                    if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
                        try {
                            fs.unlinkSync(this.tempFilePath);
                        } catch (cleanupError) {
                            console.error(`❌ Failed to clean up temp file ${this.tempFilePath}:`, cleanupError);
                        }
                    }

                    if (this.audic) {
                        this.audic.destroy();
                        this.audic = null;
                    }
                    this.tempFilePath = null;
                });
            }

        } catch (error) {
            console.error(`❌ Failed to start playback for ${this.name}:`, error);
            this.isPlaying = false;
        }
    }

    checkCommand(cmd: string): boolean {
        try {
            require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    stop(): void {
        this.isPlaying = false;
        if (this.audioProcess) {
            this.audioProcess.kill('SIGTERM');
            this.audioProcess = null;
        }
        if (this.audic) {
            this.audic.destroy();
            this.audic = null;
        }
        if (this.stream) {
            this.stream.destroy();
            this.stream = null;
        }
        // Clean up temp file
        if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
            try {
                fs.unlinkSync(this.tempFilePath);
                console.log(`🗑️ Cleaned up temp file: ${this.tempFilePath}`);
            } catch (error) {
                console.error(`❌ Failed to clean up temp file ${this.tempFilePath}:`, error);
            }
            this.tempFilePath = null;
        }
        console.log(`⏹️  Stopped track: ${this.name}`);
    }

    pause(): void {
        // Implement pause logic
        this.isPlaying = false;
    }

    resume(): void {
        // Implement resume logic
        this.isPlaying = true;
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(2, volume)); // 0-200%

        // For audic-based playback, apply volume immediately if playing
        if (this.audic) {
            this.audic.volume = this.isMuted ? 0 : this.volume;
            console.log(`🎚️ Applied volume=${this.volume} to track: ${this.name}`);
        } else if (this.audioProcess && !this.audioProcess.killed && !this.isMuted) {
            try {
                const mpvVolume: number = this.volume * 100;
                const command: string = `{ "command": ["set_property", "volume", ${mpvVolume}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🎚️ Applied volume=${this.volume} (mpv=${mpvVolume}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply volume to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply volume to track ${this.name}:`, (error as Error).message);
            }
        }
    }

    setPan(pan: number): void {
        this.pan = Math.max(-1, Math.min(1, pan)); // -1 to 1

        // Apply pan to running mpv process
        if (this.audioProcess && !this.audioProcess.killed) {
            try {
                // Convert pan (-1 to 1) to mpv audio-balance (-1 to 1)
                const audioBalance: number = pan;
                const command: string = `{ "command": ["set_property", "audio-balance", ${audioBalance}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🎛️ Applied pan=${pan} (audio-balance=${audioBalance}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply pan to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply pan to track ${this.name}:`, (error as Error).message);
            }
        } else {
            console.log(`🎛️ Track ${this.name} not playing, pan state saved for next playback`);
        }
    }

    setMute(muted: boolean): void {
        this.isMuted = muted;

        // Apply mute to running audic instance
        if (this.audic) {
            this.audic.volume = muted ? 0 : this.volume;
            console.log(`🔇 Applied mute=${muted} (volume=${this.audic.volume}) to track: ${this.name}`);
        } else if (this.audioProcess && !this.audioProcess.killed) {
            const volume: number = muted ? 0 : (this.volume * 100);
            try {
                // Send volume command to mpv via stdin (mpv accepts JSON commands)
                const command: string = `{ "command": ["set_property", "volume", ${volume}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🔇 Applied mute=${muted} (volume=${volume}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply mute to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply mute to track ${this.name}:`, (error as Error).message);
            }
        } else {
            console.log(`🔇 Track ${this.name} not playing, mute state saved for next playback`);
        }
    }

    applyEffects(audioStream: any): any {
        // Apply real-time volume and panning effects
        // This is a simplified version - in production you'd use proper audio processing
        return audioStream;
    }

    getState(): AudioTrackState {
        return {
            id: this.id,
            name: this.name,
            filePath: this.filePath,
            duration: this.duration,
            channels: this.channels,
            sampleRate: this.sampleRate,
            volume: this.volume,
            pan: this.pan,
            isMuted: this.isMuted,
            isPlaying: this.isPlaying,
            currentPosition: this.currentPosition
        };
    }
}

export default AudioTrack;
