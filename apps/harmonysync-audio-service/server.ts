import express, { Request, Response, Application } from 'express';
import http from 'http';
import net from 'net';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Audic and track classes moved to audioTrack.ts

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

import { AudioTrack } from './audioTrack';
import { AudioMixer, MixerState } from './audioMixer';

// AudioMixer implementation moved to audioMixer.ts — use the imported `AudioMixer` class/instance below.

// After refactor, create mixer instance passing `io` once it's available later

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

// Global mixer instance (pass io for event emissions)
const mixer: AudioMixer = new AudioMixer(io);

// Logging setup
// Logging setup
// __dirname is .../apps/harmonysync-audio-service/dist
// ../ -> .../apps/harmonysync-audio-service
// ../../ -> .../apps
// ../../../ -> .../RustPresenter (Project Root)
const LOG_FILE = path.join(__dirname, '../../../ErrorLog.txt');

const logToFile = (message: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFile(LOG_FILE, logLine, (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
};

// Initial log
logToFile('=== Audio Service Started ===');
logToFile(`Platform: ${process.platform}, FFmpeg: ${ffmpegAvailable}`);

const isGenericTrackName = (name: string): boolean => {
    if (!name) return true;
    return /^track\s*\d+$/i.test(name.trim());
};

const resolveTrackName = (name: string, filePath: string | undefined, index: number): string => {
    const rawName = (name || '').trim();
    const fileName = filePath ? path.basename(filePath, path.extname(filePath)) : '';

    if (isGenericTrackName(rawName)) {
        return fileName || rawName || `Track ${index + 1}`;
    }

    return rawName || fileName || `Track ${index + 1}`;
};

const normalizeMixerState = (state: MixerState): MixerState => {
    const normalizedTracks = state.tracks.map((track, index) => ({
        ...track,
        name: resolveTrackName(track.name, track.filePath, index)
    }));

    const nameById = new Map(normalizedTracks.map(track => [track.id, track.name] as const));
    const normalizedSongs = state.songs.map(song => {
        if (!song) return song;
        return {
            ...song,
            tracks: song.tracks.map((track, index) => ({
                ...track,
                name: resolveTrackName(nameById.get(track.id) || track.name, undefined, index)
            }))
        };
    });

    return {
        ...state,
        tracks: normalizedTracks,
        songs: normalizedSongs
    };
};

const emitMixerStateChanged = (): void => {
    const normalizedState = normalizeMixerState(mixer.getMixerState());
    io.emit('mixer_state_changed', normalizedState);
};

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
        console.log('[/api/tracks/load] Request received');
        console.log('[/api/tracks/load] Request body:', JSON.stringify(req.body));
        console.log('[/api/tracks/load] Content-Type:', req.headers['content-type']);

        const { filePath, name } = req.body;
        console.log('[/api/tracks/load] Extracted filePath:', filePath);
        console.log('[/api/tracks/load] Extracted name:', name);

        if (!filePath) {
            console.error('[/api/tracks/load] ERROR: filePath is required but was not provided in request body');
            res.status(400).json({ error: 'filePath is required' });
            return;
        }

        const trackId: string = await mixer.loadTrack(filePath, name);

        // Emit to all connected clients
        emitMixerStateChanged();

        console.log('[/api/tracks/load] Track loaded successfully:', trackId);
        res.json({ trackId, success: true });
    } catch (error) {
        console.error('Error loading track:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/clear', (_req: Request, res: Response): void => {
    try {
        mixer.clearAllTracks();

        // Emit to all connected clients
        emitMixerStateChanged();

        res.json({ success: true, message: 'All tracks cleared' });
    } catch (error) {
        console.error('Error clearing tracks:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/preload-all', async (_req: Request, res: Response): Promise<void> => {
    try {
        console.log('[/api/tracks/preload-all] Preloading all tracks...');
        await mixer.preloadAllTracks();

        // Emit to all connected clients
        emitMixerStateChanged();

        console.log('[/api/tracks/preload-all] All tracks preloaded successfully');
        res.json({ success: true, message: 'All tracks preloaded' });
    } catch (error) {
        console.error('Error preloading tracks:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/:id/preload', async (req: Request, res: Response): Promise<void> => {
    try {
        const trackId: string = req.params.id;
        console.log(`[/api/tracks/${trackId}/preload] Preloading track...`);

        const success = await mixer.preloadTrack(trackId);

        if (!success) {
            res.status(500).json({ error: 'Failed to preload track' });
            return;
        }

        // Emit to all connected clients
        emitMixerStateChanged();

        console.log(`[/api/tracks/${trackId}/preload] Track preloaded successfully`);
        res.json({ success: true, message: 'Track preloaded' });
    } catch (error) {
        console.error('Error preloading track:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/tracks/:trackId/play', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.playTrack(trackId);

    if (success) {
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/stop', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.stopTrack(trackId);

    if (success) {
        emitMixerStateChanged();
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
        emitMixerStateChanged();
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
        emitMixerStateChanged();
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
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

// Compatibility endpoints: some clients (Electron IPC) send trackIndex instead of trackId.
// Map trackIndex -> trackId using the same ordering as `getMixerState()` (Array.from(this.tracks.values())).
app.post('/api/tracks/mute', (req: Request, res: Response): void => {
    const { trackIndex, muted } = req.body as { trackIndex?: number, muted?: boolean };
    if (typeof trackIndex !== 'number') {
        res.status(400).json({ error: 'trackIndex (number) is required in body' });
        return;
    }

    const trackArray = Array.from(mixer.tracks.values());
    const track = trackArray[trackIndex];
    if (!track) {
        res.status(404).json({ error: `Track not found at index ${trackIndex}` });
        return;
    }

    const success = mixer.setTrackMute(track.id, Boolean(muted));
    if (success) {
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to set mute' });
    }
});

app.post('/api/tracks/volume', (req: Request, res: Response): void => {
    const { trackIndex, volume } = req.body as { trackIndex?: number, volume?: number };
    if (typeof trackIndex !== 'number' || typeof volume !== 'number') {
        res.status(400).json({ error: 'trackIndex (number) and volume (number) are required in body' });
        return;
    }

    const trackArray = Array.from(mixer.tracks.values());
    const track = trackArray[trackIndex];
    if (!track) {
        res.status(404).json({ error: `Track not found at index ${trackIndex}` });
        return;
    }

    const success = mixer.setTrackVolume(track.id, volume);
    if (success) {
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to set volume' });
    }
});

app.post('/api/tracks/pan', (req: Request, res: Response): void => {
    const { trackIndex, pan } = req.body as { trackIndex?: number, pan?: number };
    if (typeof trackIndex !== 'number' || typeof pan !== 'number') {
        res.status(400).json({ error: 'trackIndex (number) and pan (number) are required in body' });
        return;
    }

    const trackArray = Array.from(mixer.tracks.values());
    const track = trackArray[trackIndex];
    if (!track) {
        res.status(404).json({ error: `Track not found at index ${trackIndex}` });
        return;
    }

    const success = mixer.setTrackPan(track.id, pan);
    if (success) {
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to set pan' });
    }
});

app.post('/api/mixer/play-all', (_req: Request, res: Response): void => {
    mixer.playAllTracks();
    emitMixerStateChanged();
    res.json({ success: true });
});

app.post('/api/mixer/stop-all', (_req: Request, res: Response): void => {
    mixer.stopAllTracks();
    emitMixerStateChanged();
    res.json({ success: true });
});

app.post('/api/mixer/master-volume', (req: Request, res: Response): void => {
    const { volume } = req.body;
    mixer.setMasterVolume(volume);
    emitMixerStateChanged();
    res.json({ success: true });
});

app.post('/api/mixer/apply-default-panning', (_req: Request, res: Response): void => {
    mixer.applyDefaultPanning();
    emitMixerStateChanged();
    res.json({ success: true });
});

app.get('/api/mixer/state', (_req: Request, res: Response): void => {
    const normalizedState = normalizeMixerState(mixer.getMixerState());
    res.json(normalizedState);
});

app.delete('/api/tracks/:trackId', (req: Request, res: Response): void => {
    const { trackId } = req.params;
    const success: boolean = mixer.removeTrack(trackId);

    if (success) {
        emitMixerStateChanged();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.delete('/api/mixer/clear', (_req: Request, res: Response): void => {
    mixer.clearAllTracks();
    emitMixerStateChanged();
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
        emitMixerStateChanged();
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
        emitMixerStateChanged();
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
        emitMixerStateChanged();
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
        emitMixerStateChanged();
        res.json({ success });
    } catch (error) {
        console.error('Error removing song:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/songs', (_req: Request, res: Response): void => {
    try {
        const normalizedState = normalizeMixerState(mixer.getMixerState());
        res.json({ success: true, songs: normalizedState.songs });
    } catch (error) {
        console.error('Error getting songs:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/songs/:songId', (req: Request, res: Response): void => {
    try {
        const { songId } = req.params;
        const normalizedState = normalizeMixerState(mixer.getMixerState());
        const song = normalizedState.songs.find((item) => item?.id === songId) || null;
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
    socket.emit('mixer_state_changed', normalizeMixerState(mixer.getMixerState()));

    socket.on('disconnect', (): void => {
        console.log('Client disconnected:', socket.id);
    });

    // Handle real-time commands via WebSocket
    socket.on('client_log', (message: string) => {
        logToFile(`[CLIENT] ${message}`);
    });

    socket.on('load_track', async (data: LoadTrackData & { requestId?: string }): Promise<void> => {
        const logMsg = `[Socket] load_track received for ${data.filePath} (req: ${data.requestId})`;
        console.log(logMsg);
        logToFile(logMsg);

        try {
            const trackId: string = await mixer.loadTrack(data.filePath, data.name);
            emitMixerStateChanged();

            const successMsg = `[Socket] Track loaded ${trackId}, emitting track_loaded`;
            console.log(successMsg);
            logToFile(successMsg);

            socket.emit('track_loaded', { trackId, success: true, requestId: data.requestId });
        } catch (error) {
            const errorMsg = `[Socket] Load error: ${(error as Error).message}`;
            console.error(errorMsg);
            logToFile(errorMsg);

            socket.emit('error', { message: (error as Error).message, requestId: data.requestId });
        }
    });

    socket.on('play_track', (data: PlayTrackData): void => {
        const success: boolean = mixer.playTrack(data.trackId);
        if (success) {
            emitMixerStateChanged();
        }
    });

    socket.on('stop_track', (data: StopTrackData): void => {
        const success: boolean = mixer.stopTrack(data.trackId);
        if (success) {
            emitMixerStateChanged();
        }
    });

    // Track control events
    socket.on('set_track_mute', (data: SetTrackMuteData): void => {
        console.log(`🔇 Setting track ${data.trackId} mute to ${data.muted}`);
        const success: boolean = mixer.setTrackMute(data.trackId, data.muted);
        if (success) {
            emitMixerStateChanged();
            socket.emit('track_mute_changed', { trackId: data.trackId, muted: data.muted, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track mute: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_pan', (data: SetTrackPanData): void => {
        console.log(`🎛️ Setting track ${data.trackId} pan to ${data.pan}`);
        const success: boolean = mixer.setTrackPan(data.trackId, data.pan);
        if (success) {
            emitMixerStateChanged();
            socket.emit('track_pan_changed', { trackId: data.trackId, pan: data.pan, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track pan: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_volume', (data: SetTrackVolumeData): void => {
        console.log(`🎚️ Setting track ${data.trackId} volume to ${data.volume}`);
        const success: boolean = mixer.setTrackVolume(data.trackId, data.volume);
        if (success) {
            emitMixerStateChanged();
            socket.emit('track_volume_changed', { trackId: data.trackId, volume: data.volume, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track volume: track ${data.trackId} not found` });
        }
    });

    socket.on('preload_track', async (data: { trackId: string }): Promise<void> => {
        console.log(`🔄 Preloading track ${data.trackId}`);
        try {
            const success = await mixer.preloadTrack(data.trackId);
            if (success) {
                emitMixerStateChanged();
                socket.emit('track_preloaded', { trackId: data.trackId, success: true });
            } else {
                socket.emit('error', { message: `Failed to preload track ${data.trackId}` });
            }
        } catch (error) {
            socket.emit('error', { message: (error as Error).message });
        }
    });

    socket.on('preload_all_tracks', async (): Promise<void> => {
        console.log('🔄 Preloading all tracks');
        try {
            await mixer.preloadAllTracks();
            emitMixerStateChanged();
            socket.emit('all_tracks_preloaded', { success: true });
        } catch (error) {
            socket.emit('error', { message: (error as Error).message });
        }
    });

    // ─── Multi-Song Preloading Events ─────────────────────────

    socket.on('preload_song', async (data: { songId: string; folderPath: string; trackFiles: string[] }): Promise<void> => {
        console.log(`🔄 Preloading song ${data.songId} (${data.trackFiles.length} tracks)`);
        try {
            await mixer.preloadSongTracks(data.songId, data.folderPath, data.trackFiles);
            socket.emit('song_preloaded', { songId: data.songId, success: true });
            emitMixerStateChanged();
        } catch (error) {
            socket.emit('error', { message: (error as Error).message });
        }
    });

    socket.on('switch_song', (data: { songId: string }): void => {
        console.log(`⚡ Switching to song ${data.songId}`);
        mixer.switchSong(data.songId);
        emitMixerStateChanged();
        socket.emit('song_switched', { songId: data.songId, success: true });
    });

    socket.on('clear_song', (data: { songId: string }): void => {
        console.log(`🧹 Clearing song ${data.songId}`);
        mixer.clearSong(data.songId);
        emitMixerStateChanged();
        socket.emit('song_cleared', { songId: data.songId, success: true });
    });
});

// Port configuration
const PORT: number = parseInt(process.env.PORT || '3001', 10);
const IS_TEST_ENV: boolean = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
let isShuttingDown = false;

const shutdown = (reason: string, error?: unknown, exitCode: number = 1): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (error) {
        console.error(`🛑 Audio service shutting down due to ${reason}:`, error);
    } else {
        console.log(`🛑 Audio service shutting down (${reason})`);
    }

    try {
        mixer.stopAllTracks();
        mixer.clearAllTracks();
    } catch (cleanupError) {
        console.error('Failed to cleanup audio tracks:', cleanupError);
    }

    if (IS_TEST_ENV) {
        return;
    }

    server.close(() => {
        process.exit(exitCode);
    });
};

// Error handling
process.on('uncaughtException', (error: Error): void => {
    if ((error as any).code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${PORT} is already in use. Assuming audio service is already running.`);
        process.exit(0);
    } else {
        console.error('Uncaught Exception:', error);
        shutdown('uncaughtException', error);
    }
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>): void => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection', reason);
});

process.on('SIGTERM', () => {
    shutdown('SIGTERM', undefined, 0);
});

process.on('SIGINT', () => {
    shutdown('SIGINT', undefined, 0);
});

// Start server
const isPortInUse = (port: number, host: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const tester = net.createServer();
        tester.once('error', (error: any) => {
            if (error?.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        tester.once('listening', () => {
            tester.close(() => resolve(false));
        });
        tester.listen(port, host);
    });
};

const startServer = (): void => {
    server.on('error', (error: any): void => {
        if (error.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${PORT} is already in use. Assuming audio service is already running.`);
            process.exit(0);
        } else {
            console.error('Server error:', error);
            process.exit(1);
        }
    });

    try {
        server.listen(PORT, HOST, (): void => {
            console.log(`🎵 HarmonySync Audio Service running on http://${HOST}:${PORT}`);
            console.log(`🔗 REST API: http://${HOST}:${PORT}/api`);
            console.log(`🔌 WebSocket: ws://${HOST}:${PORT}`);
            console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
        });
    } catch (error: any) {
        if (error?.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${PORT} is already in use. Assuming audio service is already running.`);
            process.exit(0);
        }
        console.error('Server error:', error);
        process.exit(1);
    }
};

// Bind explicitly to localhost to avoid exposing the service on external interfaces
if (process.env.NODE_ENV !== 'test') {
    isPortInUse(PORT, HOST)
        .then((inUse) => {
            if (inUse) {
                console.warn(`⚠️ Port ${PORT} is already in use. Skipping audio service startup.`);
                return;
            }
            startServer();
        })
        .catch((error) => {
            console.error('Failed to check port availability:', error);
            process.exit(1);
        });
}

export { AudioTrack, AudioMixer, mixer, app, serverInstance };
