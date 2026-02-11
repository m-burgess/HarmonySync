import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { AudioTrack, getAudic, AudioTrackState } from './audioTrack';
import type { Server as SocketIOServer } from 'socket.io';
import FFmpegMixer, { TrackInput } from './ffmpegMixer';

export interface Song {
    id: string;
    name: string;
    trackIds: string[];
    isPlaying: boolean;
}

export interface SongState {
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

export interface CrossfadeInfo {
    startTime: number;
    duration: number;
    oldTracks: string[];
    newTracks: string[];
    completed: boolean;
}

export interface MemoryUsageInfo {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}

export interface MixerState {
    masterVolume: number;
    isPlaying: boolean;
    currentSongId: string | null;
    songs: (SongState | null)[];
    tracks: AudioTrackState[];
    memoryUsage: MemoryUsageInfo;
}

export class AudioMixer {
    public tracks: Map<string, AudioTrack>;
    public songs: Map<string, Song>;
    public currentSongId: string | null;
    public masterVolume: number;
    public isPlaying: boolean;
    public speaker: any | null;
    public mixedStream: any | null;
    public crossfadeDuration: number;
    public activeCrossfade: CrossfadeInfo | null;
    public io: SocketIOServer | null;
    private ffmpegMixer: FFmpegMixer;
    public useSingleProcessMixing: boolean;

    constructor(io: SocketIOServer | null = null) {
        this.tracks = new Map<string, AudioTrack>();
        this.songs = new Map<string, Song>();
        this.currentSongId = null;
        this.masterVolume = 1.0;
        this.isPlaying = false;
        this.speaker = null;
        this.mixedStream = null;
        this.crossfadeDuration = 3000; // 3 seconds default crossfade
        this.activeCrossfade = null;
        this.io = io;
        this.ffmpegMixer = new FFmpegMixer();
        // Frontend Web Audio handles playback; disable backend FFmpeg mixing.
        this.useSingleProcessMixing = false;
        console.log('ℹ️  Backend FFmpeg mixing disabled (frontend Web Audio handles playback)');
    }

    async loadTrack(filePath: string, name: string | null = null): Promise<string> {
        console.log(`🎵 LoadTrack called: "${filePath}" (name: ${name})`);
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
        this.applyDefaultPanningToTrack(track);
        return trackId;
    }

    removeTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.stop();
            track.cleanupPreloadedResources();
            this.tracks.delete(trackId);
            return true;
        }
        return false;
    }

    /**
     * Preload a specific track for instant playback
     */
    async preloadTrack(trackId: string): Promise<boolean> {
        const track = this.tracks.get(trackId);
        if (!track) {
            console.error(`Track ${trackId} not found for preloading`);
            return false;
        }

        console.log(`🔄 Preloading track: ${track.name}`);
        const success = await track.preload();
        
        if (this.io) {
            this.io.emit('mixer_state_changed', this.getMixerState());
        }

        return success;
    }

    /**
     * Preload all currently loaded tracks
     */
    async preloadAllTracks(): Promise<void> {
        console.log(`🔄 Preloading all ${this.tracks.size} tracks...`);
        const preloadPromises = Array.from(this.tracks.values()).map(track => track.preload());
        await Promise.all(preloadPromises);
        
        if (this.io) {
            this.io.emit('mixer_state_changed', this.getMixerState());
        }
        
        console.log(`✅ All tracks preloaded`);
    }

    clearAllTracks(): void {
        console.log('🧹 Clearing all tracks');
        this.stopAllTracks();
        for (const track of this.tracks.values()) {
            track.stop();
            track.cleanupPreloadedResources();
        }
        this.tracks.clear();
        this.songs.clear();
        this.currentSongId = null;
        if (this.io) {
            this.io.emit('tracks_cleared');
            this.io.emit('mixer_state_changed', this.getMixerState());
        }
        console.log('✅ All tracks and songs cleared');
    }

    // Song management methods
    async createSong(songName: string, trackPaths: string[]): Promise<string> {
        const songId: string = uuidv4();
        const trackIds: string[] = [];
        console.log(`🎵 Creating song: "${songName}" with ${trackPaths.length} tracks`);
        for (const trackPath of trackPaths) {
            try {
                const trackId = await this.loadTrack(trackPath);
                trackIds.push(trackId);
            } catch (error) {
                console.error(`Failed to load track ${trackPath} for song ${songName}:`, error);
            }
        }
        const song: Song = { id: songId, name: songName, trackIds: trackIds, isPlaying: false };
        this.songs.set(songId, song);
        console.log(`✅ Created song: ${songName} (ID: ${songId}) with ${trackIds.length} tracks`);
        this.currentSongId = songId;
        return songId;
    }

    playSong(songId: string): void {
        const song = this.songs.get(songId);
        if (!song) {
            throw new Error(`Song not found: ${songId}`);
        }
        if (this.currentSongId && this.currentSongId !== songId) {
            this.stopSong(this.currentSongId);
        }
        if (song.isPlaying) {
            console.log(`⚠️  Song ${song.name} is already playing`);
            return;
        }
        console.log(`▶️  Playing song: ${song.name}`);
        const activeTracks: AudioTrack[] = [];
        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track && !track.isMuted) activeTracks.push(track);
        }
        if (activeTracks.length === 0) {
            console.log('⚠️  No tracks to play in song');
            return;
        }
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
        if (!song) return false;
        console.log(`⏹️  Stopping song: ${song.name}`);
        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track) track.stop();
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
        if (!song) return false;
        this.stopSong(songId);
        for (const trackId of song.trackIds) {
            this.removeTrack(trackId);
        }
        this.songs.delete(songId);
        console.log(`🗑️  Removed song: ${song.name}`);
        return true;
    }

    getSongState(songId: string): SongState | null {
        const song = this.songs.get(songId);
        if (!song) return null;
        return {
            id: song.id,
            name: song.name,
            isPlaying: song.isPlaying,
            trackCount: song.trackIds.length,
            tracks: song.trackIds.map(trackId => {
                const track = this.tracks.get(trackId);
                return track ? { id: track.id, name: track.name, isPlaying: track.isPlaying, volume: track.volume, pan: track.pan, isMuted: track.isMuted } : null;
            }).filter((t): t is NonNullable<typeof t> => t !== null)
        };
    }

    getAllSongs(): (SongState | null)[] {
        const songs: (SongState | null)[] = [];
        for (const song of this.songs.values()) songs.push(this.getSongState(song.id));
        return songs;
    }

    playTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) { track.play(); return true; }
        return false;
    }

    stopTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) { track.stop(); return true; }
        return false;
    }

    async playAllTracks(): Promise<void> {
        if (this.currentSongId) { this.playSong(this.currentSongId); return; }
        this.stopAllTracks();
        await new Promise(resolve => setTimeout(resolve, 100));
        const activeTracks: AudioTrack[] = [];
        for (const track of this.tracks.values()) if (!track.isMuted) activeTracks.push(track);
        if (activeTracks.length === 0) { console.log('⚠️  No tracks to play'); return; }
        console.log(`▶️  Playing ${activeTracks.length} tracks in sync`);
        
        // Use single-process FFmpeg mixing to eliminate drift
        if (this.useSingleProcessMixing) {
            console.log('🎵 Using single-process FFmpeg mixer (eliminates drift)');
            await this.startFFmpegMixedPlayback(activeTracks);
        } else {
            console.log('🎵 Using synchronized simultaneous playback (legacy)');
            await this.startSynchronizedSimultaneousPlayback(activeTracks);
        }
        
        this.isPlaying = true;
    }

    /**
     * Start playback using single FFmpeg process for perfect synchronization
     * This eliminates drift by using a single clock for all tracks
     */
    private async startFFmpegMixedPlayback(tracks: AudioTrack[]): Promise<void> {
        try {
            console.log('🔄 Preparing tracks for FFmpeg mixing...');
            
            // Prepare all tracks (convert to WAV if needed)
            const preparedTracks = await Promise.all(
                tracks.map(async track => ({
                    track,
                    audioFilePath: await this.prepareTrackForPlayback(track)
                }))
            );
            
            console.log(`✅ All tracks prepared`);
            
            // Build TrackInput array for FFmpegMixer
            const trackInputs: TrackInput[] = preparedTracks.map(({ track, audioFilePath }) => ({
                filePath: audioFilePath,
                volume: track.volume,
                pan: track.pan,
                isMuted: track.isMuted,
                name: track.name
            }));
            
            // Start mixed playback
            const success = await this.ffmpegMixer.startMixedPlayback(trackInputs);
            
            if (success) {
                // Mark all tracks as playing
                // Note: When using FFmpegMixer, individual tracks don't have audioProcess
                // instances. The isPlaying flag indicates they're part of the mixed playback.
                tracks.forEach(track => {
                    track.isPlaying = true;
                });
                console.log(`✅ FFmpeg mixer started successfully`);
            } else {
                throw new Error('FFmpeg mixer failed to start');
            }
            
        } catch (error) {
            console.error('❌ Error in FFmpeg mixed playback:', error);
            console.log('🔄 Falling back to synchronized simultaneous playback');
            await this.startSynchronizedSimultaneousPlayback(tracks);
        }
    }

    async startMasterClockPlayback(tracks: AudioTrack[], masterTrack: AudioTrack): Promise<void> {
        try {
            console.log(`🎯 Master clock designated: ${masterTrack.name}`);
            console.log(`🔍 Master track path: ${masterTrack.filePath}`);
            console.log(`🎵 Starting ALL tracks simultaneously (including master clock)...`);
            
            // Log track durations for debugging
            console.log('📊 Track durations:');
            tracks.forEach(track => {
                console.log(`  - ${track.name}: ${track.duration?.toFixed(2) ?? 'unknown'}s`);
            });
            
            // Prepare all tracks first before scheduling
            console.log('🔄 Preparing all tracks...');
            const prepareStartTime = Date.now();
            const preparedTracks = await Promise.all(tracks.map(async track => ({ track, audioFilePath: await this.prepareTrackForPlayback(track) })));
            const prepareTime = Date.now() - prepareStartTime;
            console.log(`✅ All tracks prepared in ${prepareTime}ms`);
            
            // Use a larger buffer to ensure all tracks are ready before playback starts
            // This prevents drift by giving enough time for all audio processes to initialize
            const schedulingBufferMs = 500; // Increased from 250ms to 500ms for better synchronization
            const startAtMs = Date.now() + schedulingBufferMs;
            
            console.log(`⏰ Scheduling playback to start at +${schedulingBufferMs}ms from now`);
            const startTime: number = Date.now();
            const allTrackPromises: Promise<void>[] = preparedTracks.map(({ track, audioFilePath }) => this.startPreparedTrackAt(track, audioFilePath, startAtMs));
            const results: PromiseSettledResult<void>[] = await Promise.allSettled(allTrackPromises);
            const totalTime: number = Date.now() - startTime;
            const failedTracks = results.filter(r => r.status === 'rejected');
            const succeededTracks = results.filter(r => r.status === 'fulfilled');
            if (failedTracks.length > 0) {
                console.warn(`⚠️ ${failedTracks.length} track(s) failed to start:`);
                results.forEach((result, index) => { if (result.status === 'rejected') { const trackName = tracks[index]?.name || `Track ${index}`; console.error(`   - ${trackName}: ${result.reason}`); } });
            }
            if (succeededTracks.length === 0) throw new Error('All tracks failed to start');
            console.log(`✅ ${succeededTracks.length}/${tracks.length} tracks started simultaneously in ${totalTime}ms`);
            console.log(`✅ Master clock (${masterTrack.name}) and slave tracks are now playing in sync`);
            
            // Verify synchronization after a brief delay
            setTimeout(() => {
                if (!masterTrack.isPlaying) {
                    console.warn('⚠️ Warning: Master clock may have failed to start');
                } else {
                    console.log('✅ Master clock verified playing');
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error in master clock playback:', error);
            console.log('🔄 Falling back to synchronized simultaneous playback');
            await this.startSynchronizedSimultaneousPlayback(tracks);
        }
    }

    async startSynchronizedSimultaneousPlayback(tracks: AudioTrack[]): Promise<void> {
        try {
            // Log track information for debugging
            console.log('📊 Preparing synchronized playback for tracks:');
            tracks.forEach(track => {
                console.log(`  - ${track.name}: ${track.duration?.toFixed(2) ?? 'unknown'}s`);
            });
            
            // Prepare all tracks first before scheduling
            console.log('🔄 Preparing all tracks for synchronized playback...');
            const prepareStartTime = Date.now();
            const preparedTracks = await Promise.all(tracks.map(async track => ({ track, audioFilePath: await this.prepareTrackForPlayback(track) })));
            const prepareTime = Date.now() - prepareStartTime;
            console.log(`✅ All tracks prepared in ${prepareTime}ms`);
            
            // Use a larger scheduling buffer to prevent drift
            // This gives all audio processes enough time to initialize before playback
            const schedulingBufferMs = 300; // Increased from 50ms to 300ms for better sync
            const startAtMs = Date.now() + schedulingBufferMs;
            
            console.log(`⏰ Scheduling synchronized playback to start at +${schedulingBufferMs}ms from now`);
            
            if (this.io) {
                this.io.emit('playback_ready', { trackCount: preparedTracks.length, startAtMs, schedulingBufferMs });
            }
            const startTime: number = Date.now();
            const promises: Promise<void>[] = preparedTracks.map(({ track, audioFilePath }) => this.startPreparedTrackAt(track, audioFilePath, startAtMs));
            const results: PromiseSettledResult<void>[] = await Promise.allSettled(promises);
            const totalTime: number = Date.now() - startTime;
            const failedTracks = results.filter(r => r.status === 'rejected');
            const succeededTracks = results.filter(r => r.status === 'fulfilled');
            if (failedTracks.length > 0) {
                console.warn(`⚠️ ${failedTracks.length} track(s) failed to start:`);
                results.forEach((result, index) => { if (result.status === 'rejected') { const trackName = tracks[index]?.name || `Track ${index}`; console.error(`   - ${trackName}: ${result.reason}`); } });
            }
            if (succeededTracks.length === 0) throw new Error('All tracks failed to start');
            console.log(`✅ ${succeededTracks.length}/${tracks.length} tracks started simultaneously in ${totalTime}ms`);
            
            // Verify all tracks are playing
            setTimeout(() => {
                const playingCount = tracks.filter(t => t.isPlaying).length;
                console.log(`🎵 Verification: ${playingCount}/${tracks.length} tracks confirmed playing`);
            }, 200);
        } catch (error) {
            console.error('❌ Error in synchronized playback:', error);
            throw error;
        }
    }

    startTrackWithClock(track: AudioTrack, isMaster: boolean): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (track.isPlaying) { resolve(); return; }
            try { const audioFilePath = await this.prepareTrackForPlayback(track); await this.startPreparedTrack(track, audioFilePath); resolve(); } catch (error) { console.error(`❌ Error in startTrackWithClock for ${track.name}:`, error); reject(error); }
        });
    }

    private async prepareTrackForPlayback(track: AudioTrack): Promise<string> {
        if (track.audic) { try { track.audic.destroy(); } catch (error) { console.error(`⚠️ Error cleaning up existing audic for ${track.name}:`, error); } track.audic = null; }
        if (track.audioProcess) { try { track.audioProcess.kill('SIGTERM'); } catch (error) { console.error(`⚠️ Error cleaning up existing audio process for ${track.name}:`, error); } track.audioProcess = null; }
        if (track.tempFilePath && fs.existsSync(track.tempFilePath)) { try { fs.unlinkSync(track.tempFilePath); } catch (error) { console.error(`⚠️ Error cleaning up existing temp file for ${track.name}:`, error); } track.tempFilePath = null; }
        const fileExt = path.extname(track.filePath).toLowerCase();
        const isClickOrGuide: boolean = track.name.toLowerCase().includes('click') || track.name.toLowerCase().includes('guide') || track.name.toLowerCase().includes('metronome');
        const pan: number = isClickOrGuide ? -1 : 1; track.pan = pan;
        let audioFilePath = track.filePath;
        if (fileExt !== '.wav') {
            console.log(`🎵 Converting ${track.name} to WAV via FFmpeg (format: ${fileExt})`);
            const tempDir = os.tmpdir(); const tempFileName = `harmony_${track.id}_${Date.now()}.wav`; audioFilePath = path.join(tempDir, tempFileName); track.tempFilePath = audioFilePath;
            const { spawn } = require('child_process');
            const ffmpegProcess = spawn('ffmpeg', ['-i', track.filePath, '-f', 'wav', '-y', audioFilePath], { stdio: ['ignore', 'ignore', 'pipe'] });
            await new Promise<void>((resolve, reject) => {
                ffmpegProcess.on('close', (code: number) => { if (code === 0) { console.log(`✅ FFmpeg conversion complete for ${track.name}`); resolve(); } else { reject(new Error(`FFmpeg exited with code ${code}`)); } });
                ffmpegProcess.on('error', (error: Error) => { console.error(`❌ FFmpeg error during conversion for ${track.name}:`, error); reject(error); });
            });
        }
        return audioFilePath;
    }

    private async startPreparedTrack(track: AudioTrack, audioFilePath: string): Promise<void> {
        if (this.commandExists('ffplay')) {
            const ffplayPath = this.getCommandPath('ffplay');
            const volumePercent = Math.round((track.isMuted ? 0 : track.volume) * 100);
            const clampedPan = Math.max(-1, Math.min(1, track.pan));
            const angle = ((clampedPan + 1) * Math.PI) / 4; // 0 to pi/2
            const leftGain = Math.cos(angle); const rightGain = Math.sin(angle);
            const panFilter = `pan=stereo|c0=${leftGain.toFixed(4)}*c0|c1=${rightGain.toFixed(4)}*c1`;
            const args = ['-nodisp','-autoexit','-loglevel','error','-volume',String(volumePercent),'-seek_interval','0'];
            if (clampedPan !== 0) args.push('-af', panFilter);
            args.push(audioFilePath);
            const { spawn } = require('child_process');
            track.audioProcess = spawn(ffplayPath, args, { stdio: ['ignore','ignore','ignore'] });
            track.isPlaying = true; console.log(`▶️ Playing ${track.name} (ffplay)`);
            const audioProcess = track.audioProcess; if (audioProcess) { audioProcess.on('close', () => { track.isPlaying = false; if (track.tempFilePath && fs.existsSync(track.tempFilePath)) { try { fs.unlinkSync(track.tempFilePath); console.log(`🗑️ Cleaned up: ${track.tempFilePath}`); } catch (e) {} } }); }
            return;
        }
        const AudicCtor = getAudic();
        if (AudicCtor) {
            track.audic = new AudicCtor(audioFilePath) as any;
            (track.audic as any).volume = track.isMuted ? 0 : track.volume;
            (track.audic as any).play();
            track.isPlaying = true;
            console.log(`▶️ Playing ${track.name} (audic)`);
            const durationSecondsRaw = Number(track.duration);
            const durationSeconds = Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0 ? durationSecondsRaw : 245;
            console.log(`⚠️ Using timeout-based track ending for ${track.name} (duration: ${durationSeconds.toFixed(2)}s)`);
            setTimeout(() => {
                console.log(`✅ Track ended (timeout): ${track.name}`);
                track.isPlaying = false;
                if (track.tempFilePath && fs.existsSync(track.tempFilePath)) { try { fs.unlinkSync(track.tempFilePath); console.log(`🗑️ Cleaned up: ${track.tempFilePath}`); } catch (e) {} }
            }, durationSeconds * 1000);
        } else {
            console.warn('Audic not available; skipping playback fallback');
        }
    }

    private async startPreparedTrackAt(track: AudioTrack, audioFilePath: string, startAtMs: number): Promise<void> {
        const delayMs = Math.max(0, startAtMs - Date.now());
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
        await this.startPreparedTrack(track, audioFilePath);
    }

    commandExists(cmd: string): boolean {
        try {
            if (process.platform === 'win32') { require('child_process').execSync(`where ${cmd}`, { stdio: 'ignore' }); } else { require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' }); }
            return true;
        } catch (error) {
            return false;
        }
    }

    getCommandPath(cmd: string): string {
        try {
            if (process.platform === 'win32') { const result: string = require('child_process').execSync(`where ${cmd}`, { encoding: 'utf8' }); return result.trim().split('\n')[0]; } else { const result: string = require('child_process').execSync(`which ${cmd}`, { encoding: 'utf8' }); return result.trim(); }
        } catch (error) { return cmd; }
    }

    startTrackWithDelay(track: AudioTrack, delayMs: number): Promise<void> {
        return new Promise<void>((resolve) => { setTimeout(async () => { try { await this.startTrackWithClock(track, false); resolve(); } catch (error) { console.error(`❌ Failed to start delayed track ${track.name}:`, error); resolve(); } }, delayMs); });
    }

    checkCommand(cmd: string): boolean {
        try { require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; } catch (error) { return false; }
    }

    stopAllTracks(): void {
        console.log('🛑 Stopping all tracks');
        
        // Stop FFmpeg mixer if using single-process mixing
        if (this.ffmpegMixer.isCurrentlyPlaying()) {
            console.log('🛑 Stopping FFmpeg mixer');
            this.ffmpegMixer.stop();
        }
        
        if (this.currentSongId) { this.stopSong(this.currentSongId); return; }
        for (const track of this.tracks.values()) {
            if (track.audioProcess) { try { track.audioProcess.kill('SIGTERM'); console.log(`⏹️ Stopped track: ${track.name}`); } catch (error) { console.error(`❌ Error stopping track ${track.name}:`, error); } }
            if (track.audic) { try { track.audic.destroy(); console.log(`⏹️ Stopped track: ${track.name}`); } catch (error) { console.error(`❌ Error stopping track ${track.name}:`, error); } }
            if (track.tempFilePath && fs.existsSync(track.tempFilePath)) { try { fs.unlinkSync(track.tempFilePath); console.log(`🗑️ Cleaned up temp file: ${track.tempFilePath}`); } catch (error) { console.error(`❌ Failed to clean up temp file ${track.tempFilePath}:`, error); } }
            track.isPlaying = false; track.audioProcess = null; track.audic = null; track.tempFilePath = null;
        }
        this.isPlaying = false;
        if (this.io) this.io.emit('mixer_state_changed', this.getMixerState());
    }

    setTrackVolume(trackId: string, volume: number): boolean { const track = this.tracks.get(trackId); if (track) { track.setVolume(volume); return true; } return false; }
    setTrackPan(trackId: string, pan: number): boolean { const track = this.tracks.get(trackId); if (track) { track.setPan(pan); return true; } return false; }
    setTrackMute(trackId: string, muted: boolean): boolean { const track = this.tracks.get(trackId); if (track) { track.setMute(muted); return true; } return false; }
    setMasterVolume(volume: number): void { this.masterVolume = Math.max(0, Math.min(2, volume)); }

    getMixerState(): MixerState { return { masterVolume: this.masterVolume, isPlaying: this.isPlaying, currentSongId: this.currentSongId, songs: this.getAllSongs(), tracks: Array.from(this.tracks.values()).map(track => track.getState()), memoryUsage: this.getMemoryUsage() }; }

    getMemoryUsage(): MemoryUsageInfo { const usage = process.memoryUsage(); return { rss: usage.rss, heapUsed: usage.heapUsed, heapTotal: usage.heapTotal, external: usage.external, arrayBuffers: usage.arrayBuffers }; }

    setCrossfadeDuration(duration: number): void { this.crossfadeDuration = Math.max(100, Math.min(10000, duration)); }

    async crossfadeToNewTracks(newTrackPaths: string[], fadeDuration: number | null = null): Promise<boolean> {
        const fadeTime: number = fadeDuration || this.crossfadeDuration;
        console.log(`🎵 Starting crossfade transition (${fadeTime}ms)`);
        try {
            const currentTracks: AudioTrack[] = Array.from(this.tracks.values()).filter(t => t.isPlaying);
            const newTrackIds: string[] = [];
            for (const trackPath of newTrackPaths) {
                try { const trackId = await this.loadTrack(trackPath); newTrackIds.push(trackId); } catch (error) { console.error(`Failed to load track for crossfade: ${trackPath}`, error); }
            }
            if (newTrackIds.length === 0) { console.warn('No new tracks loaded for crossfade'); return false; }
            this.applyDefaultPanning();
            this.activeCrossfade = { startTime: Date.now(), duration: fadeTime, oldTracks: currentTracks.map(t => t.id), newTracks: newTrackIds, completed: false };
            for (const trackId of newTrackIds) { const track = this.tracks.get(trackId); if (track) { const originalVolume: number = track.volume; track.volume = 0; track.play(); track.originalVolume = originalVolume; } }
            await this.performCrossfade();
            return true;
        } catch (error) { console.error('❌ Crossfade error:', error); if (this.activeCrossfade) this.activeCrossfade = null; throw error; }
    }

    async performCrossfade(): Promise<void> {
        if (!this.activeCrossfade) { console.warn('No active crossfade to perform'); return; }
        try {
            const { duration, oldTracks, newTracks } = this.activeCrossfade;
            const steps: number = 50; const stepDuration: number = duration / steps;
            for (let i = 0; i <= steps; i++) {
                if (!this.activeCrossfade) { console.log('Crossfade was cancelled'); return; }
                const progress: number = i / steps; const fadeOutVolume: number = 1 - progress; const fadeInVolume: number = progress;
                for (const trackId of oldTracks) { const track = this.tracks.get(trackId); if (track && track.isPlaying) track.setVolume(fadeOutVolume * (track.originalVolume || 1)); }
                for (const trackId of newTracks) { const track = this.tracks.get(trackId); if (track && track.isPlaying) track.setVolume(fadeInVolume * (track.originalVolume || 1)); }
                if (this.io) this.io.emit('crossfade_progress', { progress: progress, fadeOutVolume: fadeOutVolume, fadeInVolume: fadeInVolume });
                if (i < steps) await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
            for (const trackId of oldTracks) { const track = this.tracks.get(trackId); if (track) { track.stop(); this.tracks.delete(trackId); } }
            for (const trackId of newTracks) { const track = this.tracks.get(trackId); if (track && track.originalVolume !== undefined) { track.setVolume(track.originalVolume); delete track.originalVolume; } }
            const completedCrossfade = { oldTracks: oldTracks, newTracks: newTracks, duration: duration, completed: true };
            this.activeCrossfade = null;
            if (this.io) { this.io.emit('crossfade_complete', completedCrossfade); this.io.emit('mixer_state_changed', this.getMixerState()); }
            console.log('✅ Crossfade transition completed');
        } catch (error) { console.error('❌ Error during crossfade performance:', error); this.activeCrossfade = null; throw error; }
    }

    applyDefaultPanning(): void {
        const trackArray: AudioTrack[] = Array.from(this.tracks.values());
        const hasClickOrGuide: boolean = trackArray.some(track => track.name.toLowerCase().includes('click') || track.name.toLowerCase().includes('guide'));
        for (const track of trackArray) {
            const lowerName: string = track.name.toLowerCase(); let panValue: number = 0;
            if (hasClickOrGuide) { if (lowerName.includes('click') || lowerName.includes('guide')) panValue = -1; else panValue = 1; }
            track.setPan(panValue);
        }
    }

    applyDefaultPanningToTrack(track: AudioTrack): void {
        const trackArray: AudioTrack[] = Array.from(this.tracks.values());
        const hasClickOrGuide: boolean = trackArray.some(t => t.name.toLowerCase().includes('click') || t.name.toLowerCase().includes('guide'));
        const lowerName: string = track.name.toLowerCase(); let panValue: number = 0;
        if (hasClickOrGuide) { if (lowerName.includes('click') || lowerName.includes('guide')) panValue = -1; else panValue = 1; }
        track.setPan(panValue);
    }
}

export default AudioMixer;
