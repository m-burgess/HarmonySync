import { io, Socket } from 'socket.io-client';

// Types previously imported from WebAudioMixer (now deleted)
export interface AudioTrackInfo {
    track_name: string;
    file_path: string;
}

export interface TrackState {
    id: string;
    name: string;
    filePath: string;
    isPlaying: boolean;
    isPreloaded: boolean;
    volume: number;
    pan: number;
    isMuted: boolean;
    duration: number;
}

// Define the state structure matching the backend
interface BackendTrackState {
    id: string;
    name: string;
    filePath: string;
    duration: number;
    volume: number;
    pan: number;
    isMuted: boolean;
    isPlaying: boolean;
}

interface BackendMixerState {
    masterVolume: number;
    isPlaying: boolean;
    tracks: BackendTrackState[];
}

export class RemoteAudioMixer {
    private socket: Socket;
    private tracks: Map<string, TrackState> = new Map();
    private masterVolume: number = 1.0;
    private isPlaying: boolean = false;

    constructor() {
        // Connect to the Audio Service (Node.js + Go sidecar)
        this.socket = io('http://localhost:3001');

        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('[RemoteAudioMixer] Connected to Audio Service');
        });

        this.socket.on('disconnect', () => {
            console.log('[RemoteAudioMixer] Disconnected from Audio Service');
        });

        this.socket.on('mixer_state_changed', (state: BackendMixerState) => {
            this.updateLocalState(state);
        });

        this.socket.on('error', (err: any) => {
            console.error('[RemoteAudioMixer] Socket error:', err);
        });
    }

    private updateLocalState(state: BackendMixerState) {
        this.masterVolume = state.masterVolume;
        this.isPlaying = state.isPlaying;

        // Sync tracks
        // For now, let's just replace our local state with the backend state
        this.tracks.clear();
        state.tracks.forEach(t => {
            this.tracks.set(t.id, {
                id: t.id,
                name: t.name,
                filePath: t.filePath,
                isPlaying: t.isPlaying,
                isPreloaded: true, // Remote engine handles it
                volume: t.volume,
                pan: t.pan,
                isMuted: t.isMuted,
                duration: t.duration || 0 // Backend might not send duration yet
            });
        });
    }

    async loadTracks(folderPath: string): Promise<{ tracks?: AudioTrackInfo[] }> {
        console.log(`[RemoteAudioMixer] Loading tracks from: ${folderPath}`);

        try {
            if (!window.electronAPI) {
                throw new Error('Electron API is not available');
            }
            const audioFiles = await window.electronAPI.getAudioFiles(folderPath);
            return this.loadFiles(audioFiles);
        } catch (error) {
            console.error('[RemoteAudioMixer] Error loading tracks:', error);
            throw error;
        }
    }

    /**
     * Wait for socket connection, reconnecting if needed.
     */
    private async ensureConnected(): Promise<void> {
        if (this.socket.connected) return;

        console.log('[RemoteAudioMixer] Socket not connected, waiting for connection...');
        this.socket.connect(); // trigger reconnect

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Socket connection timeout after 5s'));
            }, 5000);

            this.socket.once('connect', () => {
                clearTimeout(timeout);
                console.log('[RemoteAudioMixer] Socket reconnected');
                resolve();
            });
        });
    }

    async loadFiles(filePaths: string[]): Promise<{ tracks?: AudioTrackInfo[] }> {
        if (!filePaths || filePaths.length === 0) {
            return { tracks: [] };
        }

        console.log(`[RemoteAudioMixer] Loading ${filePaths.length} files...`);

        // Ensure we have an active socket connection
        await this.ensureConnected();

        // Clear current tracks on backend (Await completion!)
        await this.clearAllTracks();

        const trackInfos: AudioTrackInfo[] = [];

        // Load each file
        const promises = filePaths.map(filePath => {
            return new Promise<void>((resolve, _reject) => {
                const name = this.getTrackNameFromPath(filePath);
                const requestId = Math.random().toString(36).substring(7);

                const cleanup = () => {
                    this.socket.off('track_loaded', onSuccess);
                    this.socket.off('error', onError);
                };

                const onSuccess = (data: any) => {
                    const msg = `[RemoteAudioMixer] track_loaded evt: req=${data.requestId} vs my=${requestId}`;
                    console.log(msg);
                    this.socket.emit('client_log', msg);

                    if (data.requestId === requestId) {
                        cleanup();
                        trackInfos.push({
                            track_name: name,
                            file_path: filePath
                        });
                        resolve();
                    }
                };

                const onError = (err: any) => {
                    const msg = `[RemoteAudioMixer] error evt: req=${err.requestId} vs my=${requestId} - ${err.message}`;
                    console.error(msg);
                    this.socket.emit('client_log', msg);

                    if (err.requestId === requestId) {
                        cleanup();
                        console.error(`[RemoteAudioMixer] Failed to load ${name}:`, err);
                        // We resolve anyway to allow other tracks to load
                        resolve();
                    }
                };

                this.socket.on('track_loaded', onSuccess);
                this.socket.on('error', onError);

                // Timeout fallback
                setTimeout(() => {
                    cleanup();
                    console.warn(`[RemoteAudioMixer] Timeout loading ${name} (req=${requestId})`);
                    resolve();
                }, 10000);

                this.socket.emit('load_track', { filePath, name, requestId });
            });
        });

        await Promise.all(promises);

        return { tracks: trackInfos };
    }

    private getTrackNameFromPath(filePath: string): string {
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        return fileName.replace(/\.[^.]+$/, '');
    }

    async play(): Promise<void> {
        await fetch('http://localhost:3001/api/mixer/play-all', { method: 'POST' });
    }

    stop(): void {
        fetch('http://localhost:3001/api/mixer/stop-all', { method: 'POST' }).catch(console.error);
    }

    setTrackVolume(trackId: string, volume: number): boolean {
        this.socket.emit('set_track_volume', { trackId, volume });
        return true;
    }

    setTrackPan(trackId: string, pan: number): boolean {
        this.socket.emit('set_track_pan', { trackId, pan });
        return true;
    }

    setTrackMute(trackId: string, muted: boolean): boolean {
        this.socket.emit('set_track_mute', { trackId, muted });
        return true;
    }

    setMasterVolume(volume: number): void {
        fetch('http://localhost:3001/api/mixer/master-volume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume })
        }).catch(console.error);
    }

    // ─── Multi-Song Preloading ─────────────────────────────────

    private preloadedSongIds: Set<string> = new Set();

    /**
     * Preload a song's tracks into the Go engine in the background.
     * Returns a promise that resolves when all tracks are decoded and buffered.
     */
    async preloadSong(songId: string, folderPath: string, trackFiles: string[]): Promise<void> {
        if (this.preloadedSongIds.has(songId)) {
            console.log(`⚡ Song ${songId} already preloaded`);
            return;
        }

        await this.ensureConnected();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Preload timeout for song ${songId}`));
            }, 120000); // 2 min timeout for large songs

            this.socket.once('song_preloaded', (data: { songId: string; success: boolean }) => {
                clearTimeout(timeout);
                if (data.songId === songId && data.success) {
                    this.preloadedSongIds.add(songId);
                    resolve();
                } else {
                    reject(new Error(`Preload failed for song ${songId}`));
                }
            });

            this.socket.emit('preload_song', { songId, folderPath, trackFiles });
        });
    }

    /**
     * Instantly switch to a preloaded song. No loading delay.
     */
    switchSong(songId: string): void {
        this.socket.emit('switch_song', { songId });
    }

    /**
     * Check if a song is preloaded and ready for instant switching
     */
    isSongPreloaded(songId: string): boolean {
        return this.preloadedSongIds.has(songId);
    }

    /**
     * Free one song's memory from the Go engine
     */
    clearSong(songId: string): void {
        this.socket.emit('clear_song', { songId });
        this.preloadedSongIds.delete(songId);
    }

    async clearAllTracks(): Promise<void> {
        try {
            await fetch('http://localhost:3001/api/mixer/clear', { method: 'DELETE' });
            this.tracks.clear();
            this.preloadedSongIds.clear();
        } catch (e) {
            console.error(e);
        }
    }

    // Required by WebAudioService but can be no-op or implemented
    async replaceTrackBuffer(_trackId: string, _newFilePath: string): Promise<boolean> {
        console.warn('[RemoteAudioMixer] replaceTrackBuffer not fully implemented');
        return false;
    }

    async preloadAllTracks(): Promise<void> {
        // No-op, handled by backend
    }

    cleanup(): void {
        this.stop();
        this.socket.disconnect();
    }

    getState() {
        return {
            isPlaying: this.isPlaying,
            masterVolume: this.masterVolume,
            trackCount: this.tracks.size,
            tracks: Array.from(this.tracks.values())
        };
    }
}
