// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid conflict with local polyfill

// Types matching Go Media Engine
export interface TrackInfo {
    id: string;
    path: string;
    duration: number;
    pan?: number;
}

export interface SongInfo {
    id: string;
    tracks: TrackInfo[];
}

export interface AudioTrackInfo {
    track_name: string;
    file_path: string;
}

export interface AudioTrackState {
    id: string;
    name: string;
    filePath: string;
    isPlaying: boolean;
    volume: number;
    pan: number;
    isMuted: boolean;
    duration: number;
    isPreloaded: boolean; // Added for compatibility
}

export interface MixerState {
    isPlaying: boolean;
    activeSongId: string | null;
    tracks: AudioTrackState[];
    transposition?: number;
    loadingProgress?: { current: number; total: number; songId: string };
}

export class RemoteAudioMixer {
    private ws: WebSocket | null = null;
    private baseUrl = 'http://localhost:3001';
    private wsUrl = 'ws://localhost:3001/ws';

    private state: MixerState = {
        isPlaying: false,
        activeSongId: null,
        tracks: []
    };

    // Song ID -> Song Info
    private songs: Map<string, SongInfo> = new Map();
    private stateListeners: ((event: string, state: MixerState) => void)[] = [];

    constructor() {
        this.connect();
    }

    private connect() {
        console.log('[RemoteAudioMixer] Connecting to Go Media Engine...');
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('[RemoteAudioMixer] Connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleMessage(msg);
            } catch (e) {
                console.error('[RemoteAudioMixer] Failed to parse message:', event.data);
            }
        };

        this.ws.onclose = () => {
            console.log('[RemoteAudioMixer] Disconnected. Reconnecting in 3s...');
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (err) => {
            console.error('[RemoteAudioMixer] WebSocket error:', err);
        };
    }

    private handleMessage(msg: any) {
        console.log('[RemoteAudioMixer] Received:', msg);

        switch (msg.type) {
            case 'audio_play':
                this.state.isPlaying = true;
                break;
            case 'audio_pause':
                this.state.isPlaying = false;
                break;
            case 'audio_stop':
                this.state.isPlaying = false;
                break;
            case 'audio_song_activated':
                this.state.activeSongId = msg.songId;
                // Re-hydrate tracks from our local cache of songs
                if (this.songs.has(msg.songId)) {
                    const song = this.songs.get(msg.songId)!;
                    this.state.tracks = song.tracks.map(t => ({
                        id: t.id,
                        name: this.getFilename(t.path),
                        filePath: t.path,
                        isPlaying: this.state.isPlaying,
                        volume: 1.0, // Default for now
                        pan: 0.0,
                        isMuted: false,
                        duration: t.duration,
                        isPreloaded: true
                    }));
                }
                break;
            case 'audio_volume_changed':
                const track = this.state.tracks.find(t => t.id === msg.trackId);
                if (track) {
                    track.volume = msg.volume;
                }
                break;
            case 'audio_cleared':
                this.state.tracks = [];
                this.state.activeSongId = null;
                this.state.isPlaying = false;
                break;
            case 'audio_song_transposed':
                if (this.state.activeSongId === msg.songId) {
                    this.state.transposition = msg.semitones;
                }
                break;
            case 'audio_load_progress':
                this.state.loadingProgress = {
                    songId: msg.songId,
                    current: msg.current,
                    total: msg.total
                };
                this.notifyListeners('progress');
                return;
        }

        this.notifyListeners('state_changed');
    }

    public onStateChange(callback: (event: string, state: MixerState) => void): void {
        this.stateListeners.push(callback);
        callback('initial_state', this.state);
    }

    private notifyListeners(event: string) {
        this.stateListeners.forEach(cb => cb(event, this.state));
    }

    // --- API Methods ---

    async loadTracks(folderPath: string): Promise<{ tracks?: AudioTrackInfo[] }> {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return { tracks: [] };
        }
        const files = await window.electronAPI.getAudioFiles(folderPath);
        // loadFiles returns promises of tracks? No, it returns Promise<{tracks...}>
        return this.loadFiles(files);
    }

    async loadFiles(filePaths: string[]): Promise<{ tracks: AudioTrackInfo[] }> {
        if (!filePaths.length) return { tracks: [] };

        const songId = uuidv4();
        const tracks: TrackInfo[] = filePaths.map(path => {
            const filename = this.getFilename(path);
            const pan = this.getPanFromFilename(filename);

            return {
                id: uuidv4(),
                path: path,
                duration: 0,
                pan: pan
            };
        });

        const payload = {
            id: songId,
            tracks: tracks
        };

        console.log(`[RemoteAudioMixer] Creating song ${songId} with tracks:`, tracks);

        try {
            const res = await fetch(`${this.baseUrl}/api/songs/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

            this.songs.set(songId, { id: songId, tracks });

            return {
                tracks: tracks.map(t => ({
                    track_name: this.getFilename(t.path),
                    file_path: t.path,
                    pan: t.pan
                }))
            };

        } catch (e) {
            console.error('[RemoteAudioMixer] Failed to create song:', e);
            throw e;
        }
    }

    private getPanFromFilename(filename: string): number {
        const lowerName = filename.toLowerCase();
        let pan = 1.0; // Default Right

        // 1. Center (Split/Stereo) - Takes Precedence
        if (lowerName.includes('split') || lowerName.includes('stereo')) {
            pan = 0.0;
        }
        // 2. Left (Click/Guide/Metronome)
        else if (lowerName.includes('click') || lowerName.includes('guide') || lowerName.includes('metronome')) {
            pan = -1.0;
        }

        console.log(`[RemoteAudioMixer] Pan for "${filename}": ${pan}`);
        return pan;
    }

    async play(): Promise<void> {
        await fetch(`${this.baseUrl}/api/mixer/play`, { method: 'POST' });
    }

    async pause(): Promise<void> {
        await fetch(`${this.baseUrl}/api/mixer/pause`, { method: 'POST' });
    }

    async stop(): Promise<void> {
        await fetch(`${this.baseUrl}/api/mixer/stop`, { method: 'POST' });
    }

    setTrackVolume(trackId: string, volume: number) {
        fetch(`${this.baseUrl}/api/mixer/volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId, volume })
        }).catch(e => console.error(e));

        const track = this.state.tracks.find(t => t.id === trackId);
        if (track) {
            track.volume = volume;
            this.notifyListeners('local_update');
        }
    }

    setTrackPan(trackId: string, pan: number) {
        fetch(`${this.baseUrl}/api/mixer/pan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId, pan })
        }).catch(e => console.error(e));

        const track = this.state.tracks.find(t => t.id === trackId);
        if (track) {
            track.pan = pan;
            this.notifyListeners('local_update');
        }
    }

    setTrackMute(trackId: string, muted: boolean) {
        fetch(`${this.baseUrl}/api/mixer/mute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId, muted })
        }).catch(e => console.error(e));

        const track = this.state.tracks.find(t => t.id === trackId);
        if (track) {
            track.isMuted = muted;
            this.notifyListeners('local_update');
        }
    }

    setMasterVolume(volume: number) {
        console.warn('setMasterVolume not fully implemented in client');
    }

    async transposeSong(songId: string, semitones: number): Promise<void> {
        await fetch(`${this.baseUrl}/api/songs/transpose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId, semitones })
        });
    }

    async preloadSong(songId: string, folderPath: string, trackFiles: string[]): Promise<void> {
        const tracks: TrackInfo[] = trackFiles.map(f => ({
            id: uuidv4(),
            path: `${folderPath}/${f}`, // construct path
            duration: 0
        }));

        const payload = { id: songId, tracks };
        await fetch(`${this.baseUrl}/api/songs/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        this.songs.set(songId, { id: songId, tracks });
    }

    switchSong(songId: string): void {
        console.warn('switchSong not fully implemented - requires explicit activate endpoint or play');
    }

    isSongPreloaded(songId: string): boolean {
        return this.songs.has(songId);
    }

    clearSong(songId: string): void {
        this.songs.delete(songId);
    }

    async preloadAllTracks(): Promise<void> { }

    async createSong(name: string, trackPaths: string[]): Promise<string> {
        const songId = uuidv4();
        const tracks: TrackInfo[] = trackPaths.map(path => ({
            id: uuidv4(),
            path: path,
            duration: 0
        }));

        await fetch(`${this.baseUrl}/api/songs/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: songId, tracks })
        });

        this.songs.set(songId, { id: songId, tracks });
        return songId;
    }

    async clearAllTracks(): Promise<void> {
        await this.stop();
    }

    cleanup(): void {
        this.ws?.close();
    }

    private getFilename(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    getState() {
        return this.state;
    }
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
