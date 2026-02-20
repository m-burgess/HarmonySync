import { BaseService } from '../base/BaseService';
import type { IAudioService, IIpcService } from '../types/services';
import type { AudioTrack, MemoryUsage, MixerConfig } from '../types';
import { RemoteAudioMixer } from './RemoteAudioMixer';

/**
 * Web Audio Service Implementation
 * 
 * Adapts the WebAudioMixer to the IAudioService interface,
 * allowing drop-in replacement of the old Node.js-based audio service.
 */
export class WebAudioService extends BaseService implements IAudioService {
    protected readonly serviceName = 'WebAudioService';

    private mixer: RemoteAudioMixer;
    private isPlaying: boolean = false;

    constructor(_ipcService: IIpcService) {
        super();
        this.mixer = new RemoteAudioMixer();

        // Listen for mixer events
        window.addEventListener('audioPlaybackComplete', () => {
            this.isPlaying = false;
        });
    }

    /**
     * Load audio tracks from a folder
     */
    public async loadTracks(folderPath: string): Promise<AudioTrack[]> {
        try {
            await this.mixer.loadTracks(folderPath);

            // Get state to populate full track info
            const state = this.mixer.getState();

            // Map to AudioTrack format
            return state.tracks.map(t => ({
                id: t.id,
                name: t.name,
                path: t.filePath,
                duration: t.duration,
                volume: t.volume,
                pan: t.pan,
                muted: t.isMuted,
                isPreloaded: t.isPreloaded,
                preloadStatus: t.isPreloaded ? 'ready' : 'pending' as const
            }));
        } catch (error) {
            return this.handleError('loadTracks', error);
        }
    }

    /**
     * Transpose audio files
     */
    public transposeSong(songId: string, semitones: number): void {
        this.mixer.transposeSong(songId, semitones);
    }


    /**
     * Start playback
     */
    public async play(): Promise<void> {
        try {
            await this.mixer.play();
            this.isPlaying = true;
        } catch (error) {
            return this.handleError('play', error);
        }
    }

    /**
     * Stop playback
     */
    public async stop(): Promise<void> {
        try {
            this.mixer.stop();
            this.isPlaying = false;
        } catch (error) {
            return this.handleError('stop', error);
        }
    }

    /**
     * Pause playback (implemented as stop for now)
     */
    public async pause(): Promise<void> {
        await this.stop();
    }

    /**
     * Seek to position (Not implemented yet)
     */
    public async seek(_position: number): Promise<void> {
        console.warn('[WebAudioService] Seek not implemented yet');
    }

    /**
     * Set track volume
     */
    public async setTrackVolume(trackIndex: number, volume: number): Promise<void> {
        // Map index to ID
        const state = this.mixer.getState();
        if (state.tracks[trackIndex]) {
            this.mixer.setTrackVolume(state.tracks[trackIndex].id, volume);
        }
    }

    /**
     * Set track pan
     */
    public async setTrackPan(trackIndex: number, pan: number): Promise<void> {
        const state = this.mixer.getState();
        if (state.tracks[trackIndex]) {
            this.mixer.setTrackPan(state.tracks[trackIndex].id, pan);
        }
    }

    /**
     * Mute/unmute a track
     */
    public async muteTrack(trackIndex: number, muted: boolean): Promise<void> {
        const state = this.mixer.getState();
        if (state.tracks[trackIndex]) {
            this.mixer.setTrackMute(state.tracks[trackIndex].id, muted);
        }
    }

    /**
     * Preload all tracks
     */
    public async preloadAllTracks(): Promise<void> {
        await this.mixer.preloadAllTracks();
    }

    /**
     * Preload specific track (not optimized, preloads all for now or ignores)
     */
    public async preloadTrack(_trackId: string): Promise<void> {
        // WebAudioMixer buffers are managed internally
    }

    // ─── Multi-Song Preloading ─────────────────────────────────

    /**
     * Preload a song's tracks into the Go engine for instant switching
     */
    public async preloadSong(songId: string, folderPath: string, trackFiles: string[]): Promise<void> {
        await this.mixer.preloadSong(songId, folderPath, trackFiles);
    }

    /**
     * Instantly switch to a preloaded song
     */
    public switchSong(songId: string): void {
        this.mixer.switchSong(songId);
    }

    /**
     * Check if a song is preloaded
     */
    public isSongPreloaded(songId: string): boolean {
        return this.mixer.isSongPreloaded(songId);
    }

    /**
     * Free one song from Go engine memory
     */
    public clearSong(songId: string): void {
        this.mixer.clearSong(songId);
    }

    /**
     * Set global volume
     */
    public async setGlobalVolume(volume: number): Promise<void> {
        this.mixer.setMasterVolume(volume);
    }

    /**
     * Save mixer config (Not persistent yet)
     */
    public async saveMixerConfig(config: MixerConfig): Promise<void> {
        // TODO: Implement persistence via IPC to file system
        console.log('[WebAudioService] Save config not persisted', config);
    }

    /**
     * Load mixer config
     */
    public async loadMixerConfig(_songPath: string): Promise<MixerConfig | null> {
        return null;
    }

    /**
     * Initialize (no-op)
     */
    public async initializeAudioService(): Promise<void> {
        this.isInitialized = true;
    }

    /**
     * Start service (no-op)
     */
    public async startAudioService(): Promise<void> {
        this.isInitialized = true;
    }

    /**
     * Get memory usage (browser heap)
     */
    public async getMemoryUsage(): Promise<MemoryUsage> {
        // @ts-ignore - performance.memory is Chrome specific
        const memory = performance.memory;
        return {
            rss: 0,
            external: 0,
            heapTotal: memory ? memory.totalJSHeapSize : 0,
            heapUsed: memory ? memory.usedJSHeapSize : 0
        };
    }

    public startMemoryMonitoring(_interval: number, _callback: (usage: MemoryUsage) => void): void {
        // Not implemented
    }

    public stopMemoryMonitoring(): void {
        // Not implemented
    }

    // Event listeners - these need to be hooked up to Emitters if we want real-time updates
    // For now, they are no-ops or simple console logs
    public onPositionUpdate(_callback: (event: unknown, position: number) => void): void {
        // We could use requestAnimationFrame to emit position updates during playback
        if (this.isPlaying) {
            // Mock implementation
        }
    }

    public onTransposeError(_callback: (event: unknown, error: Error) => void): void { }

    public async createSong(name: string, trackPaths: string[]): Promise<string> {
        return this.mixer.createSong(name, trackPaths);
    }
    public onDurationUpdate(_callback: (event: unknown, duration: number) => void): void { }
    public onPlaybackStarted(_callback: (event: unknown) => void): void { }
    public onPlaybackStopped(_callback: (event: unknown) => void): void { }
    public onPlaybackPaused(_callback: (event: unknown) => void): void { }
    public onStateChange(callback: (event: unknown, state: any) => void): void {
        this.mixer.onStateChange(callback);
    }

    public async startAudioServiceFromApp(): Promise<unknown> { return true; }

    public async cleanup(): Promise<void> {
        this.mixer.cleanup();
    }

    public async playAllTracks(): Promise<void> {
        return this.play();
    }

    public async stopAllAudio(): Promise<void> {
        return this.stop();
    }

    public async goToBeginningAllTracks(): Promise<void> {
        // Not implemented
    }

    public async clearTracks(): Promise<void> {
        await this.mixer.clearAllTracks();
    }

    public async addTracks(_trackPaths: string[]): Promise<unknown[]> {
        return [];
    }

    public async loadMultipleTracks(trackPaths: string[]): Promise<{ total: number; loaded: number; results: unknown[] }> {
        console.log(`[WebAudioService] loadMultipleTracks called with ${trackPaths?.length} paths`);
        try {
            if (!this.mixer) {
                console.error('[WebAudioService] Mixer instance is undefined!');
                throw new Error('Mixer undefined');
            }
            const result = await this.mixer.loadFiles(trackPaths);
            const loadedCount = result.tracks?.length || 0;
            console.log(`[WebAudioService] loadMultipleTracks success: ${loadedCount}/${trackPaths.length}`);

            return {
                total: trackPaths.length,
                loaded: loadedCount,
                results: result.tracks || []
            };
        } catch (error) {
            this.logError('loadMultipleTracks failed', error);
            console.error('[WebAudioService] Stack:', (error as Error).stack);
            return { total: trackPaths.length, loaded: 0, results: [] };
        }
    }

    public async playAllTracksFrontendScheduled(_tracks: any[]): Promise<void> {
        return this.play();
    }

    public async stopFrontendScheduled(): Promise<void> {
        return this.stop();
    }

    public isFrontendScheduledPlaying(): boolean {
        return this.isPlaying;
    }
}
