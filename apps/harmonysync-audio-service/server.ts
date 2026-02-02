import express, { Request, Response, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { parseFile, IAudioMetadata } from 'music-metadata';
import wav from 'node-wav';
import { ChildProcess } from 'child_process';

// Type assertion for Audic since it doesn't have TypeScript types
const AudicModule = require('audic');
const Audic = AudicModule.default as any;

// Audic interface for type safety
interface AudicInstance {
    play(): void;
    destroy(): void;
    volume: number;
    on(event: 'ended' | 'error', callback: (error?: Error) => void): void;
}

// Configurable host and shutdown token
const HOST: string = process.env.HOST || '127.0.0.1';
const SHUTDOWN_TOKEN: string | null = process.env.SHUTDOWN_TOKEN || null;

// Detect platform
const IS_WINDOWS: boolean = process.platform === 'win32';
const IS_LINUX: boolean = process.platform === 'linux';
const IS_MAC: boolean = process.platform === 'darwin';

console.log(`🖥️  Platform detected: ${process.platform} (Windows: ${IS_WINDOWS}, Linux: ${IS_LINUX}, Mac: ${IS_MAC})`);

// Check for FFmpeg availability
const ffmpegAvailable: boolean = IS_WINDOWS ? 
    fs.existsSync('C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffplay.exe') :
    false;
console.log(`🎵 FFmpeg available: ${ffmpegAvailable}`);

interface AudioTrackState {
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

interface WavDecodeResult {
    channelData: Float32Array[];
    sampleRate: number;
}

class AudioTrack {
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
        // We'll use fluent-ffmpeg for format conversion and streaming
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
            
            // Play with audic
            this.audic = new Audic(tempFilePath) as AudicInstance;
            this.audic.volume = this.isMuted ? 0 : this.volume;
            
            console.log(`▶️ Starting individual track: ${this.name} (pan: ${pan})`);
            this.audic.play();
            
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

interface Song {
    id: string;
    name: string;
    trackIds: string[];
    isPlaying: boolean;
}

interface SongState {
    id: string;
    name: string;
    isPlaying: boolean;
    trackCount: number;
    tracks: Array<{
        id: string;
        name: string;
        isPlaying: boolean;
        volume: number;
        pan: number;
        isMuted: boolean;
    }>;
}

interface CrossfadeInfo {
    startTime: number;
    duration: number;
    oldTracks: string[];
    newTracks: string[];
    completed: boolean;
}

interface MixerState {
    masterVolume: number;
    isPlaying: boolean;
    currentSongId: string | null;
    songs: (SongState | null)[];
    tracks: AudioTrackState[];
    memoryUsage: MemoryUsageInfo;
}

interface MemoryUsageInfo {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}

class AudioMixer {
    public tracks: Map<string, AudioTrack>;
    public songs: Map<string, Song>;
    public currentSongId: string | null;
    public masterVolume: number;
    public isPlaying: boolean;
    public speaker: any | null;
    public mixedStream: any | null;
    public crossfadeDuration: number;
    public activeCrossfade: CrossfadeInfo | null;

    constructor() {
        this.tracks = new Map<string, AudioTrack>();
        this.songs = new Map<string, Song>();
        this.currentSongId = null;
        this.masterVolume = 1.0;
        this.isPlaying = false;
        this.speaker = null;
        this.mixedStream = null;
        this.crossfadeDuration = 3000; // 3 seconds default crossfade
        this.activeCrossfade = null;
    }

    async loadTrack(filePath: string, name: string | null = null): Promise<string> {
        console.log(`🎵 LoadTrack called: "${filePath}" (name: ${name})`);
        
        // Check if track already exists
        const existingTrack = Array.from(this.tracks.values()).find(track => track.filePath === filePath);
        if (existingTrack) {
            console.log(`⚠️  Track already loaded: ${existingTrack.name} (ID: ${existingTrack.id}) - skipping duplicate`);
            return existingTrack.id;
        }
        
        const trackId: string = uuidv4();
        const trackName: string = name || path.basename(filePath, path.extname(filePath));
        
        console.log(`✅ Loading new track: "${trackName}" (ID: ${trackId})`);
        
        const track = new AudioTrack(trackId, trackName, filePath, 0, 2, 44100);
        
        const loaded: boolean = await track.loadMetadata();
        if (!loaded) {
            throw new Error(`Failed to load track: ${filePath}`);
        }

        this.tracks.set(trackId, track);
        console.log(`Loaded track: ${trackName} (${track.duration.toFixed(2)}s)`);
        
        // Apply automatic panning based on track name
        this.applyDefaultPanningToTrack(track);
        
        return trackId;
    }

    removeTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.stop();
            this.tracks.delete(trackId);
            return true;
        }
        return false;
    }

    clearAllTracks(): void {
        console.log('🧹 Clearing all tracks');
        this.stopAllTracks();
        
        for (const track of this.tracks.values()) {
            track.stop();
        }
        
        this.tracks.clear();
        this.songs.clear();
        this.currentSongId = null;
        
        // Emit track list update
        if (serverInstance.io) {
            serverInstance.io.emit('tracks_cleared');
            serverInstance.io.emit('mixer_state_changed', this.getMixerState());
        }
        console.log('✅ All tracks and songs cleared');
    }

    // Song management methods
    async createSong(songName: string, trackPaths: string[]): Promise<string> {
        const songId: string = uuidv4();
        const trackIds: string[] = [];
        
        console.log(`🎵 Creating song: "${songName}" with ${trackPaths.length} tracks`);
        
        // Load all tracks for this song
        for (const trackPath of trackPaths) {
            try {
                const trackId = await this.loadTrack(trackPath);
                trackIds.push(trackId);
            } catch (error) {
                console.error(`Failed to load track ${trackPath} for song ${songName}:`, error);
                // Continue with other tracks
            }
        }
        
        const song: Song = {
            id: songId,
            name: songName,
            trackIds: trackIds,
            isPlaying: false
        };
        
        this.songs.set(songId, song);
        console.log(`✅ Created song: ${songName} (ID: ${songId}) with ${trackIds.length} tracks`);
        
        // Set this as the current song
        this.currentSongId = songId;
        
        return songId;
    }

    playSong(songId: string): void {
        const song = this.songs.get(songId);
        if (!song) {
            throw new Error(`Song not found: ${songId}`);
        }
        
        // Stop any currently playing song
        if (this.currentSongId && this.currentSongId !== songId) {
            this.stopSong(this.currentSongId);
        }
        
        // If this song is already playing, do nothing
        if (song.isPlaying) {
            console.log(`⚠️  Song ${song.name} is already playing`);
            return;
        }
        
        console.log(`▶️  Playing song: ${song.name}`);
        
        // Play all tracks in this song
        const activeTracks: AudioTrack[] = [];
        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track && !track.isMuted) {
                activeTracks.push(track);
            }
        }
        
        if (activeTracks.length === 0) {
            console.log('⚠️  No tracks to play in song');
            return;
        }
        
        // Use the same playback logic as playAllTracks
        const clickTrack = activeTracks.find(track => 
            track.name.toLowerCase().includes('click') || 
            track.name.toLowerCase().includes('metronome') ||
            track.name.toLowerCase().includes('guide')
        );
        
        if (clickTrack) {
            console.log(`🎯 Using ${clickTrack.name} as master clock for song`);
            this.startMasterClockPlayback(activeTracks, clickTrack);
        } else {
            console.log('🎵 Using synchronized simultaneous playback for song');
            this.startSynchronizedSimultaneousPlayback(activeTracks);
        }
        
        song.isPlaying = true;
        this.currentSongId = songId;
        this.isPlaying = true;
    }

    stopSong(songId: string): boolean {
        const song = this.songs.get(songId);
        if (!song) {
            return false;
        }
        
        console.log(`⏹️  Stopping song: ${song.name}`);
        
        // Stop all tracks in this song
        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track) {
                track.stop();
            }
        }
        
        song.isPlaying = false;
        if (this.currentSongId === songId) {
            this.currentSongId = null;
            this.isPlaying = false;
        }
        
        return true;
    }

    removeSong(songId: string): boolean {
        const song = this.songs.get(songId);
        if (!song) {
            return false;
        }
        
        // Stop the song if it's playing
        this.stopSong(songId);
        
        // Remove all tracks in this song
        for (const trackId of song.trackIds) {
            this.removeTrack(trackId);
        }
        
        this.songs.delete(songId);
        console.log(`🗑️  Removed song: ${song.name}`);
        
        return true;
    }

    getSongState(songId: string): SongState | null {
        const song = this.songs.get(songId);
        if (!song) {
            return null;
        }
        
        return {
            id: song.id,
            name: song.name,
            isPlaying: song.isPlaying,
            trackCount: song.trackIds.length,
            tracks: song.trackIds.map(trackId => {
                const track = this.tracks.get(trackId);
                return track ? {
                    id: track.id,
                    name: track.name,
                    isPlaying: track.isPlaying,
                    volume: track.volume,
                    pan: track.pan,
                    isMuted: track.isMuted
                } : null;
            }).filter((t): t is NonNullable<typeof t> => t !== null)
        };
    }

    getAllSongs(): (SongState | null)[] {
        const songs: (SongState | null)[] = [];
        for (const song of this.songs.values()) {
            songs.push(this.getSongState(song.id));
        }
        return songs;
    }

    playTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.play();
            return true;
        }
        return false;
    }

    stopTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.stop();
            return true;
        }
        return false;
    }

    async playAllTracks(): Promise<void> {
        // If we have a current song, play it
        if (this.currentSongId) {
            this.playSong(this.currentSongId);
            return;
        }
        
        // Fallback: play all tracks (for backward compatibility)
        // Stop any currently playing tracks first
        this.stopAllTracks();
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        
        const activeTracks: AudioTrack[] = [];
        
        // Collect all non-muted tracks
        for (const track of this.tracks.values()) {
            if (!track.isMuted) {
                activeTracks.push(track);
            }
        }
        
        if (activeTracks.length === 0) {
            console.log('⚠️  No tracks to play');
            return;
        }
        
        console.log(`▶️  Playing ${activeTracks.length} tracks in sync with master clock`);
        
        // Use click track as master clock if available
        const clickTrack = activeTracks.find(track => 
            track.name.toLowerCase().includes('click') || 
            track.name.toLowerCase().includes('metronome') ||
            track.name.toLowerCase().includes('guide')
        );
        
        if (clickTrack) {
            console.log(`🎯 Using ${clickTrack.name} as master clock`);
            await this.startMasterClockPlayback(activeTracks, clickTrack);
        } else {
            console.log('🎵 Using synchronized simultaneous playback');
            await this.startSynchronizedSimultaneousPlayback(activeTracks);
        }
        
        this.isPlaying = true;
    }

    async startMasterClockPlayback(tracks: AudioTrack[], masterTrack: AudioTrack): Promise<void> {
        try {
            console.log(`🎯 Master clock designated: ${masterTrack.name}`);
            console.log(`🔍 Master track path: ${masterTrack.filePath}`);
            console.log(`🎵 Starting ALL tracks simultaneously (including master clock)...`);
            
            // CRITICAL FIX: Start ALL tracks at exactly the same time
            // Professional multitrack players like multitracks.com start all tracks simultaneously,
            // not sequentially with delays. The master clock concept is just for reference,
            // not for sequential starting.
            const startTime: number = Date.now();
            
            // Prepare all track start promises (master + slaves)
            const allTrackPromises: Promise<void>[] = tracks.map(track => {
                const isMaster: boolean = track === masterTrack;
                return this.startTrackWithClock(track, isMaster);
            });
            
            // Start all tracks simultaneously - NO DELAYS
            // Use allSettled to handle partial failures gracefully
            const results: PromiseSettledResult<void>[] = await Promise.allSettled(allTrackPromises);
            
            const totalTime: number = Date.now() - startTime;
            
            // Check for any failures
            const failedTracks = results.filter(r => r.status === 'rejected');
            const succeededTracks = results.filter(r => r.status === 'fulfilled');
            
            if (failedTracks.length > 0) {
                console.warn(`⚠️ ${failedTracks.length} track(s) failed to start:`);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const trackName = tracks[index]?.name || `Track ${index}`;
                        console.error(`   - ${trackName}: ${result.reason}`);
                    }
                });
            }
            
            if (succeededTracks.length === 0) {
                throw new Error('All tracks failed to start');
            }
            
            console.log(`✅ ${succeededTracks.length}/${tracks.length} tracks started simultaneously in ${totalTime}ms`);
            console.log(`✅ Master clock (${masterTrack.name}) and slave tracks are now playing in sync`);
            
            // Deferred verification check (non-blocking, intentionally not awaited)
            setTimeout(() => {
                if (!masterTrack.isPlaying) {
                    console.warn('⚠️ Warning: Master clock may have failed to start');
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ Error in master clock playback:', error);
            console.log('🔄 Falling back to synchronized simultaneous playback');
            // Fallback to simultaneous playback
            await this.startSynchronizedSimultaneousPlayback(tracks);
        }
    }

    async startSynchronizedSimultaneousPlayback(tracks: AudioTrack[]): Promise<void> {
        try {
            // Start all tracks as close to simultaneously as possible
            const startTime: number = Date.now();
            const promises: Promise<void>[] = tracks.map(track => 
                this.startTrackWithClock(track, false) // Remove delay for true simultaneity
            );
            
            // Use allSettled to handle partial failures gracefully
            const results: PromiseSettledResult<void>[] = await Promise.allSettled(promises);
            
            const totalTime: number = Date.now() - startTime;
            
            // Check for any failures
            const failedTracks = results.filter(r => r.status === 'rejected');
            const succeededTracks = results.filter(r => r.status === 'fulfilled');
            
            if (failedTracks.length > 0) {
                console.warn(`⚠️ ${failedTracks.length} track(s) failed to start:`);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const trackName = tracks[index]?.name || `Track ${index}`;
                        console.error(`   - ${trackName}: ${result.reason}`);
                    }
                });
            }
            
            if (succeededTracks.length === 0) {
                throw new Error('All tracks failed to start');
            }
            
            console.log(`✅ ${succeededTracks.length}/${tracks.length} tracks started simultaneously in ${totalTime}ms`);
            
        } catch (error) {
            console.error('❌ Error in synchronized playback:', error);
            throw error;
        }
    }

    startTrackWithClock(track: AudioTrack, isMaster: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Prevent starting if already playing
            if (track.isPlaying) {
                console.log(`⚠️ Track ${track.name} is already playing, skipping duplicate start`);
                resolve();
                return;
            }
            
            try {
                // Clean up any existing audic instance
                if (track.audic) {
                    try {
                        track.audic.destroy();
                    } catch (error) {
                        console.error(`⚠️ Error cleaning up existing audic for ${track.name}:`, error);
                    }
                    track.audic = null;
                }
                
                // Clean up any existing temp file
                if (track.tempFilePath && fs.existsSync(track.tempFilePath)) {
                    try {
                        fs.unlinkSync(track.tempFilePath);
                    } catch (error) {
                        console.error(`⚠️ Error cleaning up existing temp file for ${track.name}:`, error);
                    }
                    track.tempFilePath = null;
                }
                // Determine pan based on track type
                const isClickOrGuide: boolean = track.name.toLowerCase().includes('click') || 
                                     track.name.toLowerCase().includes('guide') ||
                                     track.name.toLowerCase().includes('metronome');
                const pan: number = isClickOrGuide ? -1 : 1; // -1 = full left, 1 = full right
                
                // Update track's pan value for UI consistency
                track.pan = pan;
                
                // Decode WAV file
                const buffer: Buffer = fs.readFileSync(track.filePath);
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
                const tempFileName: string = `harmony_${track.id}_${Date.now()}.wav`;
                const tempFilePath: string = path.join(tempDir, tempFileName);
                fs.writeFileSync(tempFilePath, Buffer.from(pannedBuffer));
                
                // Store temp file path for cleanup
                track.tempFilePath = tempFilePath;
                
                // Play with audic
                track.audic = new Audic(tempFilePath) as AudicInstance;
                track.audic.volume = track.isMuted ? 0 : track.volume;
                
                console.log(`▶️ Starting track: ${track.name} (pan: ${pan})`);
                track.audic.play();
                track.isPlaying = true;
                
                track.audic.on('ended', () => {
                    console.log(`🏁 Track finished: ${track.name}`);
                    track.isPlaying = false;
                    
                    // Clean up temp file
                    if (track.tempFilePath && fs.existsSync(track.tempFilePath)) {
                        try {
                            fs.unlinkSync(track.tempFilePath);
                            console.log(`🗑️ Cleaned up temp file: ${track.tempFilePath}`);
                        } catch (error) {
                            console.error(`❌ Failed to clean up temp file ${track.tempFilePath}:`, error);
                        }
                    }
                    
                    if (track.audic) {
                        track.audic.destroy();
                        track.audic = null;
                    }
                    track.tempFilePath = null;
                    
                    // Check if all tracks have finished
                    const allTracksFinished: boolean = !Array.from(this.tracks.values()).some(t => t.isPlaying);
                    if (allTracksFinished && this.isPlaying) {
                        console.log('🎵 All tracks have finished playback');
                        this.isPlaying = false;
                        
                        // Emit playback complete event
                        if (serverInstance.io) {
                            serverInstance.io.emit('playback_complete', {
                                reason: 'all_tracks_finished',
                                timestamp: Date.now()
                            });
                        }
                    }
                    
                    // If master track stops, stop all tracks
                    if (isMaster) {
                        console.log('🛑 Master clock completed, stopping all tracks');
                        this.stopAllTracks();
                    }
                });
                
                track.audic.on('error', (error?: Error) => {
                    console.error(`❌ Audio playback error for ${track.name}:`, error);
                    track.isPlaying = false;
                    
                    // Clean up temp file on error
                    if (track.tempFilePath && fs.existsSync(track.tempFilePath)) {
                        try {
                            fs.unlinkSync(track.tempFilePath);
                        } catch (cleanupError) {
                            console.error(`❌ Failed to clean up temp file ${track.tempFilePath}:`, cleanupError);
                        }
                    }
                    
                    if (track.audic) {
                        track.audic.destroy();
                        track.audic = null;
                    }
                    track.tempFilePath = null;
                });
                
                resolve();
                
            } catch (error) {
                console.error(`❌ Error starting track ${track.name}:`, error);
                reject(error);
            }
        });
    }
    
    commandExists(cmd: string): boolean {
        try {
            // First try the standard PATH check
            if (IS_WINDOWS) {
                require('child_process').execSync(`where ${cmd}`, { stdio: 'ignore' });
            } else {
                require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
            }
            return true;
        } catch (error) {
            // For FFmpeg on Windows, check common installation locations
            if (IS_WINDOWS && (cmd === 'ffplay' || cmd === 'ffmpeg')) {
                const commonPaths: string[] = [
                    'C:\\Program Files\\ffmpeg\\bin',
                    'C:\\Program Files (x86)\\ffmpeg\\bin',
                    'C:\\ffmpeg\\bin',
                    'C:\\tools\\ffmpeg\\bin',
                    path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'ffmpeg', 'current', 'bin'),
                    path.join(process.env.PROGRAMDATA || '', 'chocolatey', 'lib', 'ffmpeg', 'tools', 'ffmpeg', 'bin'),
                    path.join(process.env.USERPROFILE || '', 'ffmpeg', 'bin'),
                    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0.1-full_build', 'bin')
                ];

                for (const binPath of commonPaths) {
                    const fullPath: string = path.join(binPath, cmd + (IS_WINDOWS ? '.exe' : ''));
                    if (fs.existsSync(fullPath)) {
                        console.log(`🎵 Found ${cmd} at: ${fullPath}`);
                        return true;
                    }
                }
            }
            return false;
        }
    }

    getCommandPath(cmd: string): string {
        try {
            // First try the standard PATH check
            if (IS_WINDOWS) {
                const result: string = require('child_process').execSync(`where ${cmd}`, { encoding: 'utf8' });
                return result.trim().split('\n')[0];
            } else {
                const result: string = require('child_process').execSync(`which ${cmd}`, { encoding: 'utf8' });
                return result.trim();
            }
        } catch (error) {
            // For FFmpeg on Windows, check common installation locations
            if (IS_WINDOWS && (cmd === 'ffplay' || cmd === 'ffmpeg')) {
                const commonPaths: string[] = [
                    'C:\\Program Files\\ffmpeg\\bin',
                    'C:\\Program Files (x86)\\ffmpeg\\bin',
                    'C:\\ffmpeg\\bin',
                    'C:\\tools\\ffmpeg\\bin',
                    path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'ffmpeg', 'current', 'bin'),
                    path.join(process.env.PROGRAMDATA || '', 'chocolatey', 'lib', 'ffmpeg', 'tools', 'ffmpeg', 'bin'),
                    path.join(process.env.USERPROFILE || '', 'ffmpeg', 'bin'),
                    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0.1-full_build', 'bin')
                ];

                for (const binPath of commonPaths) {
                    const fullPath: string = path.join(binPath, cmd + (IS_WINDOWS ? '.exe' : ''));
                    if (fs.existsSync(fullPath)) {
                        console.log(`🎵 Using ${cmd} at: ${fullPath}`);
                        return fullPath;
                    }
                }
            }
            return cmd; // Fall back to just the command name
        }
    }

    startTrackWithDelay(track: AudioTrack, delayMs: number): Promise<void> {
        return new Promise<void>((resolve) => {
            setTimeout(async () => {
                try {
                    await this.startTrackWithClock(track, false);
                    resolve();
                } catch (error) {
                    console.error(`❌ Failed to start delayed track ${track.name}:`, error);
                    resolve(); // Don't reject to avoid stopping other tracks
                }
            }, delayMs);
        });
    }

    checkCommand(cmd: string): boolean {
        try {
            require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    stopAllTracks(): void {
        console.log('🛑 Stopping all tracks');
        
        // Stop the current song if playing
        if (this.currentSongId) {
            this.stopSong(this.currentSongId);
            return;
        }
        
        // Stop individual track processes/audic instances
        for (const track of this.tracks.values()) {
            if (track.audioProcess) {
                try {
                    track.audioProcess.kill('SIGTERM');
                    console.log(`⏹️ Stopped track: ${track.name}`);
                } catch (error) {
                    console.error(`❌ Error stopping track ${track.name}:`, error);
                }
            }
            if (track.audic) {
                try {
                    track.audic.destroy();
                    console.log(`⏹️ Stopped track: ${track.name}`);
                } catch (error) {
                    console.error(`❌ Error stopping track ${track.name}:`, error);
                }
            }
            // Clean up temp file
            if (track.tempFilePath && fs.existsSync(track.tempFilePath)) {
                try {
                    fs.unlinkSync(track.tempFilePath);
                    console.log(`🗑️ Cleaned up temp file: ${track.tempFilePath}`);
                } catch (error) {
                    console.error(`❌ Failed to clean up temp file ${track.tempFilePath}:`, error);
                }
            }
            track.isPlaying = false;
            track.audioProcess = null;
            track.audic = null;
            track.tempFilePath = null;
        }
        
        this.isPlaying = false;
        
        // Emit state change
        if (serverInstance.io) {
            serverInstance.io.emit('mixer_state_changed', this.getMixerState());
        }
    }

    setTrackVolume(trackId: string, volume: number): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setVolume(volume);
            return true;
        }
        return false;
    }

    setTrackPan(trackId: string, pan: number): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setPan(pan);
            return true;
        }
        return false;
    }

    setTrackMute(trackId: string, muted: boolean): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setMute(muted);
            return true;
        }
        return false;
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(2, volume));
    }

    getMixerState(): MixerState {
        return {
            masterVolume: this.masterVolume,
            isPlaying: this.isPlaying,
            currentSongId: this.currentSongId,
            songs: this.getAllSongs(),
            tracks: Array.from(this.tracks.values()).map(track => track.getState()),
            memoryUsage: this.getMemoryUsage()
        };
    }

    getMemoryUsage(): MemoryUsageInfo {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            arrayBuffers: usage.arrayBuffers
        };
    }

    setCrossfadeDuration(duration: number): void {
        this.crossfadeDuration = Math.max(100, Math.min(10000, duration)); // 100ms to 10s
    }

    async crossfadeToNewTracks(newTrackPaths: string[], fadeDuration: number | null = null): Promise<boolean> {
        const fadeTime: number = fadeDuration || this.crossfadeDuration;
        
        console.log(`🎵 Starting crossfade transition (${fadeTime}ms)`);
        
        try {
            // Store current playing tracks
            const currentTracks: AudioTrack[] = Array.from(this.tracks.values()).filter(t => t.isPlaying);
            
            // Load new tracks
            const newTrackIds: string[] = [];
            for (const trackPath of newTrackPaths) {
                try {
                    const trackId = await this.loadTrack(trackPath);
                    newTrackIds.push(trackId);
                } catch (error) {
                    console.error(`Failed to load track for crossfade: ${trackPath}`, error);
                }
            }
            
            if (newTrackIds.length === 0) {
                console.warn('No new tracks loaded for crossfade');
                return false;
            }
            
            // Apply default panning to new tracks
            this.applyDefaultPanning();
            
            // Start crossfade process
            this.activeCrossfade = {
                startTime: Date.now(),
                duration: fadeTime,
                oldTracks: currentTracks.map(t => t.id),
                newTracks: newTrackIds,
                completed: false
            };
            
            // Start new tracks at volume 0
            for (const trackId of newTrackIds) {
                const track = this.tracks.get(trackId);
                if (track) {
                    const originalVolume: number = track.volume;
                    track.volume = 0;
                    track.play();
                    track.originalVolume = originalVolume; // Store for fade-in
                }
            }
            
            // Perform crossfade
            await this.performCrossfade();
            
            return true;
        } catch (error) {
            console.error('❌ Crossfade error:', error);
            // Clean up on error
            if (this.activeCrossfade) {
                this.activeCrossfade = null;
            }
            throw error;
        }
    }

    async performCrossfade(): Promise<void> {
        if (!this.activeCrossfade) {
            console.warn('No active crossfade to perform');
            return;
        }
        
        try {
            const { duration, oldTracks, newTracks } = this.activeCrossfade;
            const steps: number = 50; // 50 steps for smooth fade
            const stepDuration: number = duration / steps;
            
            for (let i = 0; i <= steps; i++) {
                // Check if crossfade was cancelled
                if (!this.activeCrossfade) {
                    console.log('Crossfade was cancelled');
                    return;
                }
                
                const progress: number = i / steps; // 0 to 1
                const fadeOutVolume: number = 1 - progress; // 1 to 0
                const fadeInVolume: number = progress; // 0 to 1
                
                // Fade out old tracks
                for (const trackId of oldTracks) {
                    const track = this.tracks.get(trackId);
                    if (track && track.isPlaying) {
                        track.setVolume(fadeOutVolume * (track.originalVolume || 1));
                    }
                }
                
                // Fade in new tracks
                for (const trackId of newTracks) {
                    const track = this.tracks.get(trackId);
                    if (track && track.isPlaying) {
                        track.setVolume(fadeInVolume * (track.originalVolume || 1));
                    }
                }
                
                // Emit progress update
                if (serverInstance.io) {
                    serverInstance.io.emit('crossfade_progress', {
                        progress: progress,
                        fadeOutVolume: fadeOutVolume,
                        fadeInVolume: fadeInVolume
                    });
                }
                
                // Wait for next step
                if (i < steps) {
                    await new Promise(resolve => setTimeout(resolve, stepDuration));
                }
            }
            
            // Stop and remove old tracks
            for (const trackId of oldTracks) {
                const track = this.tracks.get(trackId);
                if (track) {
                    track.stop();
                    this.tracks.delete(trackId);
                }
            }
            
            // Restore original volumes for new tracks
            for (const trackId of newTracks) {
                const track = this.tracks.get(trackId);
                if (track && track.originalVolume !== undefined) {
                    track.setVolume(track.originalVolume);
                    delete track.originalVolume;
                }
            }
            
            // Store crossfade info before clearing it
            const completedCrossfade = {
                oldTracks: oldTracks,
                newTracks: newTracks,
                duration: duration,
                completed: true
            };
            
            // Clear the active crossfade
            this.activeCrossfade = null;
            
            // Emit completion
            if (serverInstance.io) {
                serverInstance.io.emit('crossfade_complete', completedCrossfade);
                serverInstance.io.emit('mixer_state_changed', this.getMixerState());
            }
            
            console.log('✅ Crossfade transition completed');
        } catch (error) {
            console.error('❌ Error during crossfade performance:', error);
            // Clean up on error
            this.activeCrossfade = null;
            throw error;
        }
    }

    applyDefaultPanning(): void {
        const trackArray: AudioTrack[] = Array.from(this.tracks.values());
        const hasClickOrGuide: boolean = trackArray.some(track => 
            track.name.toLowerCase().includes('click') || 
            track.name.toLowerCase().includes('guide')
        );

        for (const track of trackArray) {
            const lowerName: string = track.name.toLowerCase();
            let panValue: number = 0; // Center by default

            if (hasClickOrGuide) {
                if (lowerName.includes('click') || lowerName.includes('guide')) {
                    panValue = -1; // Hard left
                } else {
                    panValue = 1; // Hard right
                }
            }

            track.setPan(panValue);
        }
    }

    applyDefaultPanningToTrack(track: AudioTrack): void {
        const trackArray: AudioTrack[] = Array.from(this.tracks.values());
        const hasClickOrGuide: boolean = trackArray.some(t => 
            t.name.toLowerCase().includes('click') || 
            t.name.toLowerCase().includes('guide')
        );

        const lowerName: string = track.name.toLowerCase();
        let panValue: number = 0; // Center by default

        if (hasClickOrGuide) {
            if (lowerName.includes('click') || lowerName.includes('guide')) {
                panValue = -1; // Hard left
            } else {
                panValue = 1; // Hard right
            }
        }

        track.setPan(panValue);
    }
}

// Initialize Express app and Socket.IO
const app: Application = express();
const server: http.Server = http.createServer(app);
const io: SocketIOServer = new SocketIOServer(server, {
    cors: {
        origin: ["http://localhost:1420", "http://localhost:5174"], // Tauri dev server + Vite dev server
        methods: ["GET", "POST"]
    }
});

// Store io instance for crossfade emissions
interface ServerInstance {
    io: SocketIOServer;
}

const serverInstance: ServerInstance = { io };

// Middleware
app.use(cors({
    origin: ["http://localhost:1420", "http://localhost:5174"] // Tauri dev server + Vite dev server
}));
app.use(express.json());

// Global mixer instance
const mixer: AudioMixer = new AudioMixer();

// REST API Routes
app.get('/api/health', (_req: Request, res: Response): void => {
    res.json({ 
        status: 'healthy', 
        service: 'harmonysync-audio-service',
        version: '1.0.0',
        memoryUsage: mixer.getMemoryUsage()
    });
});

app.post('/api/shutdown', (req: Request, res: Response): void => {
    console.log('🛑 Shutdown request received');

    // If a shutdown token is configured, require it in the request
    if (SHUTDOWN_TOKEN) {
        const headerToken: string | null = req.headers['x-shutdown-token'] as string || (req.headers['authorization'] ? (req.headers['authorization'].split(' ')[1] || null) : null);
        if (!headerToken || headerToken !== SHUTDOWN_TOKEN) {
            console.warn('⚠️ Unauthorized shutdown attempt');
            res.status(401).json({ status: 'unauthorized', message: 'Invalid or missing shutdown token' });
            return;
        }
    } else {
        console.warn('⚠️ No SHUTDOWN_TOKEN configured; shutdown endpoint is unprotected');
    }

    // Send response before shutting down
    res.json({ 
        status: 'shutting_down', 
        message: 'Audio service is shutting down gracefully'
    });

    // Graceful shutdown
    setTimeout(() => {
        console.log('🛑 Stopping all audio tracks...');
        mixer.stopAllTracks();
        
        console.log('🛑 Clearing all tracks...');
        mixer.clearAllTracks();
        
        console.log('🛑 Closing server...');
        server.close(() => {
            console.log('🛑 Server closed');
            process.exit(0);
        });
        
        // Force exit after 5 seconds if graceful shutdown doesn't work
        setTimeout(() => {
            console.log('🛑 Force exit');
            process.exit(1);
        }, 5000);
    }, 100); // Small delay to allow response to be sent
});

app.post('/api/tracks/load', async (req: Request, res: Response): Promise<void> => {
    try {
        const { filePath, name } = req.body;
        if (!filePath) {
            res.status(400).json({ error: 'filePath is required' });
            return;
        }

        const trackId: string = await mixer.loadTrack(filePath, name);
        const mixerState: MixerState = mixer.getMixerState();
        
        // Emit to all connected clients
        io.emit('mixer_state_changed', mixerState);
        
        res.json({ trackId, success: true });
    } catch (error) {
        console.error('Error loading track:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/clear', (_req: Request, res: Response): void => {
    try {
        mixer.clearAllTracks();
        const mixerState: MixerState = mixer.getMixerState();
        
        // Emit to all connected clients
        io.emit('mixer_state_changed', mixerState);
        
        res.json({ success: true, message: 'All tracks cleared' });
    } catch (error) {
        console.error('Error clearing tracks:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/:trackId/play', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.playTrack(trackId);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/stop', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.stopTrack(trackId);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/volume', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const { volume } = req.body;
    
    const success: boolean = mixer.setTrackVolume(trackId, volume);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/pan', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const { pan } = req.body;
    
    const success: boolean = mixer.setTrackPan(trackId, pan);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/mute', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const { muted } = req.body;
    
    const success: boolean = mixer.setTrackMute(trackId, muted);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/mixer/play-all', (_req: Request, res: Response): void => {
    mixer.playAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/stop-all', (_req: Request, res: Response): void => {
    mixer.stopAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/master-volume', (req: Request, res: Response): void => {
    const { volume } = req.body;
    mixer.setMasterVolume(volume);
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/apply-default-panning', (_req: Request, res: Response): void => {
    mixer.applyDefaultPanning();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.get('/api/mixer/state', (_req: Request, res: Response): void => {
    res.json(mixer.getMixerState());
});

app.delete('/api/tracks/:trackId', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.removeTrack(trackId);
    
    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.delete('/api/mixer/clear', (_req: Request, res: Response): void => {
    mixer.clearAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

// Crossfade endpoints
app.post('/api/mixer/crossfade', async (req: Request, res: Response): Promise<void> => {
    try {
        const { trackPaths, duration } = req.body;
        if (!trackPaths || !Array.isArray(trackPaths)) {
            res.status(400).json({ error: 'trackPaths array is required' });
            return;
        }

        const success: boolean = await mixer.crossfadeToNewTracks(trackPaths, duration);
        res.json({ success });
    } catch (error) {
        console.error('Crossfade error:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/mixer/crossfade-duration', (req: Request, res: Response): void => {
    const { duration } = req.body;
    if (typeof duration !== 'number' || duration < 100 || duration > 10000) {
        res.status(400).json({ error: 'Duration must be between 100ms and 10000ms' });
        return;
    }
    
    mixer.setCrossfadeDuration(duration);
    res.json({ success: true, duration: mixer.crossfadeDuration });
});

app.get('/api/mixer/crossfade-status', (_req: Request, res: Response): void => {
    res.json({
        isActive: !!mixer.activeCrossfade,
        crossfade: mixer.activeCrossfade,
        defaultDuration: mixer.crossfadeDuration
    });
});

// Song management endpoints
app.post('/api/songs/create', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, trackPaths } = req.body;
        if (!name || !trackPaths || !Array.isArray(trackPaths)) {
            res.status(400).json({ error: 'name and trackPaths array are required' });
            return;
        }

        const songId: string = await mixer.createSong(name, trackPaths);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true, songId });
    } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/songs/:songId/play', (req: Request, res: Response): void => {
    try {
        const { songId } = req.params;
        mixer.playSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } catch (error) {
        console.error('Error playing song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/songs/:songId/stop', (req: Request, res: Response): void => {
    try {
        const { songId } = req.params;
        const success: boolean = mixer.stopSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success });
    } catch (error) {
        console.error('Error stopping song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.delete('/api/songs/:songId', (req: Request, res: Response): void => {
    try {
        const { songId } = req.params;
        const success: boolean = mixer.removeSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success });
    } catch (error) {
        console.error('Error removing song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/songs', (_req: Request, res: Response): void => {
    try {
        const songs = mixer.getAllSongs();
        res.json({ success: true, songs });
    } catch (error) {
        console.error('Error getting songs:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/songs/:songId', (req: Request, res: Response): void => {
    try {
        const { songId } = req.params;
        const song = mixer.getSongState(songId);
        if (!song) {
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        res.json({ success: true, song });
    } catch (error) {
        console.error('Error getting song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Socket.IO event data interfaces
interface LoadTrackData {
    filePath: string;
    name: string;
}

interface PlayTrackData {
    trackId: string;
}

interface StopTrackData {
    trackId: string;
}

interface SetTrackMuteData {
    trackId: string;
    muted: boolean;
}

interface SetTrackPanData {
    trackId: string;
    pan: number;
}

interface SetTrackVolumeData {
    trackId: string;
    volume: number;
}

// Socket.IO for real-time communication
io.on('connection', (socket: Socket): void => {
    console.log('Client connected:', socket.id);
    
    // Send current mixer state to new client
    socket.emit('mixer_state_changed', mixer.getMixerState());
    
    socket.on('disconnect', (): void => {
        console.log('Client disconnected:', socket.id);
    });
    
    // Handle real-time commands via WebSocket
    socket.on('load_track', async (data: LoadTrackData): Promise<void> => {
        try {
            const trackId: string = await mixer.loadTrack(data.filePath, data.name);
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_loaded', { trackId, success: true });
        } catch (error) {
            socket.emit('error', { message: (error as Error).message });
        }
    });
    
    socket.on('play_track', (data: PlayTrackData): void => {
        const success: boolean = mixer.playTrack(data.trackId);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
        }
    });
    
    socket.on('stop_track', (data: StopTrackData): void => {
        const success: boolean = mixer.stopTrack(data.trackId);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
        }
    });

    // Track control events
    socket.on('set_track_mute', (data: SetTrackMuteData): void => {
        console.log(`🔇 Setting track ${data.trackId} mute to ${data.muted}`);
        const success: boolean = mixer.setTrackMute(data.trackId, data.muted);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_mute_changed', { trackId: data.trackId, muted: data.muted, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track mute: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_pan', (data: SetTrackPanData): void => {
        console.log(`🎛️ Setting track ${data.trackId} pan to ${data.pan}`);
        const success: boolean = mixer.setTrackPan(data.trackId, data.pan);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_pan_changed', { trackId: data.trackId, pan: data.pan, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track pan: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_volume', (data: SetTrackVolumeData): void => {
        console.log(`🎚️ Setting track ${data.trackId} volume to ${data.volume}`);
        const success: boolean = mixer.setTrackVolume(data.trackId, data.volume);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_volume_changed', { trackId: data.trackId, volume: data.volume, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track volume: track ${data.trackId} not found` });
        }
    });
});

// Error handling
process.on('uncaughtException', (error: Error): void => {
    if ((error as any).code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Another audio service may be running.`);
        console.error('💡 Please stop the existing service or use a different port.');
        process.exit(1);
    } else {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>): void => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT: number = parseInt(process.env.PORT || '3001', 10);

// Bind explicitly to localhost to avoid exposing the service on external interfaces
server.listen(PORT, HOST, (): void => {
    console.log(`🎵 HarmonySync Audio Service running on http://${HOST}:${PORT}`);
    console.log(`🔗 REST API: http://${HOST}:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
});

server.on('error', (error: any): void => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Another audio service may be running.`);
        console.error('💡 Try running: pkill -f "harmonysync-audio-service" to stop existing service');
        process.exit(1);
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});
