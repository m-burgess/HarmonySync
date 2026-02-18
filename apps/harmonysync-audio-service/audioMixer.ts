import { v4 as uuidv4 } from 'uuid';
import { AudioTrack, AudioTrackState } from './audioTrack';
import type { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { audioEngine } from './goEngineAdapter';

// Removed native module load attempt as we are using Go engine now

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



    constructor(io: SocketIOServer | null = null) {
        this.tracks = new Map<string, AudioTrack>();
        this.songs = new Map<string, Song>();
        this.currentSongId = null;
        this.masterVolume = 1.0;
        this.isPlaying = false;
        this.speaker = null;
        this.activeCrossfade = null;
        this.crossfadeDuration = 3000;
        this.io = io;

        console.log('✅ Go Audio Engine Adapter initialized');
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

        // Delegate to Go Engine
        audioEngine.loadTrack(trackId, filePath);

        const track = new AudioTrack(trackId, trackName, filePath, 0, 2, 44100);
        // We still load metadata for frontend display, but engine handles playback
        try {
            await track.loadMetadata();
        } catch (e) {
            console.warn(`Failed to load metadata for ${filePath}, using defaults`);
        }

        this.tracks.set(trackId, track);
        console.log(`Loaded track: ${trackName} (${track.duration.toFixed(2)}s)`);
        // Re-evaluate panning for ALL tracks (not just this one)
        // because the presence of click/guide/metronome tracks affects everyone
        this.applyDefaultPanning();
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

        audioEngine.clearAllTracks();

        this.tracks.clear();
        this.songs.clear();
        this.preloadedSongTracks.clear();
        this.currentSongId = null;

        if (this.io) {
            this.io.emit('tracks_cleared');
            this.io.emit('mixer_state_changed', this.getMixerState());
        }
        console.log('✅ All tracks and songs cleared');
    }

    // ─── Multi-Song Preloading ───────────────────────────────────

    /**
     * Map of songId -> Map<trackId, AudioTrack> for songs preloaded in Go engine
     */
    public preloadedSongTracks: Map<string, Map<string, AudioTrack>> = new Map();

    /**
     * Preload all tracks for a song into the Go engine without activating it.
     * The tracks are decoded + buffered in memory, ready for instant switching.
     */
    async preloadSongTracks(songId: string, folderPath: string, trackFiles: string[]): Promise<void> {
        if (this.preloadedSongTracks.has(songId)) {
            console.log(`⚡ Song ${songId} already preloaded — skipping`);
            return;
        }

        console.log(`🔄 Preloading song ${songId} (${trackFiles.length} tracks) from ${folderPath}`);
        const songTrackMap = new Map<string, AudioTrack>();

        for (const filePath of trackFiles) {
            const trackId = uuidv4();
            const trackName = path.basename(filePath, path.extname(filePath));

            // Load into Go engine under this song's group
            audioEngine.loadSongTrack(songId, trackId, filePath);

            const track = new AudioTrack(trackId, trackName, filePath, 0, 2, 44100);
            try {
                await track.loadMetadata();
            } catch (e) {
                console.warn(`Failed to load metadata for ${filePath}, using defaults`);
            }

            songTrackMap.set(trackId, track);
            console.log(`  📦 Preloaded: ${trackName} → ${trackId}`);
        }

        this.preloadedSongTracks.set(songId, songTrackMap);
        console.log(`✅ Song ${songId} preloaded (${songTrackMap.size} tracks buffered)`);
    }

    /**
     * Check if a song is preloaded and ready for instant switching
     */
    isSongPreloaded(songId: string): boolean {
        return this.preloadedSongTracks.has(songId);
    }

    /**
     * Switch to a preloaded song instantly.
     * Tells Go engine to activate the song group, updates local state.
     */
    switchSong(songId: string): void {
        if (!this.preloadedSongTracks.has(songId)) {
            console.error(`❌ Song ${songId} is not preloaded — cannot switch`);
            return;
        }

        console.log(`⚡ Switching to preloaded song: ${songId}`);

        // Tell Go engine to swap active song
        audioEngine.activateSong(songId);

        // Update local track state to point to this song's tracks
        this.tracks.clear();
        const songTrackMap = this.preloadedSongTracks.get(songId)!;
        for (const [trackId, track] of songTrackMap) {
            this.tracks.set(trackId, track);
        }

        this.currentSongId = songId;
        this.isPlaying = false;

        // Apply auto-panning for the new active song
        this.applyDefaultPanning();

        if (this.io) {
            this.io.emit('mixer_state_changed', this.getMixerState());
        }

        console.log(`✅ Switched to song ${songId} (${songTrackMap.size} tracks active)`);
    }

    /**
     * Remove one preloaded song from Go engine memory
     */
    clearSong(songId: string): void {
        audioEngine.clearSong(songId);
        this.preloadedSongTracks.delete(songId);

        // If clearing the active song, also clear local state
        if (this.currentSongId === songId) {
            this.tracks.clear();
            this.currentSongId = null;
            this.isPlaying = false;
        }

        console.log(`🧹 Cleared song ${songId} from memory`);
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

        // Mute all tracks first (except those in this song)
        // Or better: Unmute song tracks, mute others.
        // Actually, Go engine just plays everything that is volume > 0 and not mute.
        // So we must ensure only song tracks are active.

        const songTrackIds = new Set(song.trackIds);

        for (const track of this.tracks.values()) {
            if (songTrackIds.has(track.id)) {
                // Ensure it's unmuted and has volume
                if (!track.isMuted) {
                    audioEngine.setTrackMute(track.id, false);
                    audioEngine.setTrackVolume(track.id, track.volume);
                }
                track.isPlaying = true;
            } else {
                // Mute/Stop others
                audioEngine.setTrackVolume(track.id, 0);
                track.isPlaying = false;
            }
        }

        audioEngine.play();

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
        if (track) {
            // Ensure track is unmuted in engine
            audioEngine.setTrackMute(trackId, false);
            audioEngine.setTrackVolume(trackId, track.volume);

            track.play();
            audioEngine.play();
            this.isPlaying = true;
            return true;
        }
        return false;
    }

    stopTrack(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            // Mute track in engine
            audioEngine.setTrackMute(trackId, true);

            track.stop();

            // Check if any other tracks are playing
            const anyPlaying = Array.from(this.tracks.values()).some(t => t.isPlaying);
            if (!anyPlaying) {
                audioEngine.stop();
                this.isPlaying = false;
            }
            return true;
        }
        return false;
    }

    async playAllTracks(): Promise<void> {
        if (this.currentSongId) { this.playSong(this.currentSongId); return; }

        // Unmute all tracks that aren't explicitly muted
        for (const track of this.tracks.values()) {
            if (!track.isMuted) {
                audioEngine.setTrackMute(track.id, false);
                audioEngine.setTrackVolume(track.id, track.volume);
            }
            track.isPlaying = true;
        }

        console.log('▶️  Playing all loaded tracks via Go Engine');
        audioEngine.play();
        this.isPlaying = true;
    }

    /**
     * Start playback using single FFmpeg process for perfect synchronization
     * This eliminates drift by using a single clock for all tracks
     */
    // Old playback methods removed in favor of Go Engine


    stopAllTracks(): void {
        console.log('🛑 Stopping all tracks (Go Engine)');
        audioEngine.stop();

        for (const track of this.tracks.values()) {
            track.isPlaying = false;
        }
        this.isPlaying = false;

        if (this.io) this.io.emit('mixer_state_changed', this.getMixerState());
    }

    setTrackVolume(trackId: string, volume: number): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setVolume(volume);
            audioEngine.setTrackVolume(trackId, volume);
            return true;
        }
        return false;
    }
    setTrackPan(trackId: string, pan: number): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setPan(pan);
            audioEngine.setTrackPan(trackId, pan);
            return true;
        }
        return false;
    }
    setTrackMute(trackId: string, muted: boolean): boolean {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setMute(muted);
            audioEngine.setTrackMute(trackId, muted);
            return true;
        }
        return false;
    }
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(2, volume));
        // Go engine master volume default logic for now
        // Iterate and set
        for (const track of this.tracks.values()) {
            audioEngine.setTrackVolume(track.id, track.isMuted ? 0 : track.volume * this.masterVolume);
        }
    }

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

    /**
     * Check if a track name is a "special" track (click, guide, metronome)
     * that should be panned left for in-ear monitoring.
     */
    private isMonitorTrack(name: string): boolean {
        const lower = name.toLowerCase();
        return lower.includes('click') || lower.includes('guide') || lower.includes('metronome');
    }

    /**
     * Apply default panning to ALL tracks based on naming convention:
     * - If any click/guide/metronome tracks exist:
     *   - Those tracks → 100% left (-1.0) for in-ear monitors
     *   - All other tracks → 100% right (+1.0) for house speakers
     * - If no special tracks exist: all tracks stay stereo center (0.0)
     */
    applyDefaultPanning(): void {
        const trackArray: AudioTrack[] = Array.from(this.tracks.values());
        const hasMonitorTracks: boolean = trackArray.some(t => this.isMonitorTrack(t.name));

        console.log(`🎛️ Auto-panning: ${hasMonitorTracks ? 'Monitor tracks detected — splitting L/R' : 'No monitor tracks — stereo center'}`);

        for (const track of trackArray) {
            let panValue: number = 0; // default: stereo center
            if (hasMonitorTracks) {
                panValue = this.isMonitorTrack(track.name) ? -1 : 1;
            }
            track.setPan(panValue);
            // Propagate to Go engine
            audioEngine.setTrackPan(track.id, panValue);
            console.log(`🎛️ Track "${track.name}" pan → ${panValue}`);
        }
    }

    applyDefaultPanningToTrack(track: AudioTrack): void {
        // Delegate to full re-evaluation (since one track's presence affects all)
        this.applyDefaultPanning();
    }
}

export default AudioMixer;
