const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { parseFile } = require('music-metadata');
const wav = require('node-wav');
const Audic = require('audic').default;
const { spawn } = require('child_process');

// Import Native Audio Engine
// Go Audio Engine Adapter
class GoEngineAdapter {
    constructor() {
        this.process = null;
        this.ready = false;
        this.start();
    }

    start() {
        if (this.process) return;

        const goExecutable = 'c:\\Program Files\\Go\\bin\\go.exe'; // Use full path or just 'go' if in PATH
        const scriptPath = path.join(__dirname, 'go-engine');

        console.log(`🚀 Starting Go Audio Engine from ${scriptPath}...`);

        // We run 'go run .' for dev simplicity. In prod, build to exe.
        // For now, let's try 'go run .'
        // If 'go' is not in path, we might need absolute path.
        // User confirmed Go is installed.
        // Using 'go run' is slower to start but easier for now.
        // Better: build it first, then spawn the exe.

        // Let's assume we built it to 'audio-engine.exe'
        const exePath = path.join(__dirname, 'go-engine', 'audio-engine.exe');

        if (fs.existsSync(exePath)) {
            console.log(`Found compiled engine at ${exePath}`);
            this.process = spawn(exePath);
        } else {
            console.log(`Compiled engine not found. Falling back to 'go run .'`);
            this.process = spawn('go', ['run', '.'], { cwd: scriptPath, shell: true });
        }

        this.process.stdout.on('data', (data) => {
            console.log(`[GoEngine RAW] ${data}`);
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.level === 'error') {
                        console.error(`[GoEngine] ❌ ${msg.message}`);
                    } else {
                        console.log(`[GoEngine] ${msg.message}`);
                    }
                } catch (e) {
                    console.log(`[GoEngine] raw: ${line}`);
                }
            }
        });

        this.process.stderr.on('data', (data) => {
            console.error(`[GoEngine] stderr: ${data}`);
        });

        this.process.on('close', (code) => {
            console.log(`[GoEngine] Process exited with code ${code}`);
            this.process = null;
            this.ready = false;
        });

        this.ready = true;
    }

    sendCommand(op, args) {
        if (!this.process) {
            console.warn('Go Engine not running, attempting to restart...');
            this.start();
            return;
        }
        const payload = JSON.stringify({ op, args }) + '\n';
        this.process.stdin.write(payload);
    }

    loadTrack(id, path) {
        this.sendCommand('load', { id, path });
    }

    play() {
        this.sendCommand('play', {});
    }

    stop() {
        this.sendCommand('stop', {});
    }

    pause() {
        this.sendCommand('pause', {});
    }

    setTrackVolume(id, volume) {
        this.sendCommand('setVolume', { id, volume });
    }

    setTrackPan(id, pan) {
        this.sendCommand('setPan', { id, pan });
    }

    setTrackMute(id, muted) {
        this.sendCommand('setMute', { id, muted });
    }

    clearAllTracks() {
        this.sendCommand('clear', {});
    }
}

const audioEngine = new GoEngineAdapter();

// Configurable host and shutdown token
const HOST = process.env.HOST || '127.0.0.1';
const SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || null;

// Detect platform
const IS_WINDOWS = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';
const IS_MAC = process.platform === 'darwin';

console.log(`🖥️  Platform detected: ${process.platform} (Windows: ${IS_WINDOWS}, Linux: ${IS_LINUX}, Mac: ${IS_MAC})`);

// Check for FFmpeg availability
const ffmpegAvailable = IS_WINDOWS ?
    require('fs').existsSync('C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffplay.exe') :
    false;
console.log(`🎵 FFmpeg available: ${ffmpegAvailable}`);

class AudioTrack {
    constructor(id, name, filePath, duration, channels, sampleRate) {
        this.id = id;
        this.name = name;
        this.filePath = filePath;
        this.duration = duration;
        this.channels = channels;
        this.sampleRate = sampleRate;
        this.volume = 1.0;
        this.pan = 0.0;
        this.isMuted = false;
        this.isPlaying = false;
    }

    async loadMetadata() {
        try {
            const metadata = await parseFile(this.filePath);
            this.duration = metadata.format.duration || 0;
            this.channels = metadata.format.numberOfChannels || 2;
            this.sampleRate = metadata.format.sampleRate || 44100;
            return true;
        } catch (error) {
            console.error(`Failed to load metadata for ${this.filePath}:`, error);
            return false;
        }
    }

    play() {
        // Controlled by mixer now
        this.isPlaying = true;
    }

    stop() {
        this.isPlaying = false;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(2, volume));
        audioEngine.setTrackVolume(this.id, this.volume);
        console.log(`🎚️ Applied volume=${this.volume} to track: ${this.name}`);
    }

    setPan(pan) {
        this.pan = Math.max(-1, Math.min(1, pan));
        audioEngine.setTrackPan(this.id, this.pan);
        console.log(`🎛️ Applied pan=${this.pan} to track: ${this.name}`);
    }

    setMute(muted) {
        this.isMuted = muted;
        audioEngine.setTrackMute(this.id, muted);
        console.log(`🔇 Applied mute=${muted} to track: ${this.name}`);
    }

    getState() {
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
            currentPosition: 0 // TODO: Implement getPosition
        };
    }
}

class AudioMixer {
    constructor() {
        this.tracks = new Map();
        this.songs = new Map();
        this.currentSongId = null;
        this.masterVolume = 1.0;
        this.isPlaying = false;
        this.crossfadeDuration = 3000;
        this.activeCrossfade = null;
    }

    async loadTrack(filePath, name = null) {
        console.log(`🎵 LoadTrack called: "${filePath}" (name: ${name})`);

        const existingTrack = Array.from(this.tracks.values()).find(track => track.filePath === filePath);
        if (existingTrack) {
            return existingTrack.id;
        }

        const trackId = uuidv4();
        const trackName = name || path.basename(filePath, path.extname(filePath));

        console.log(`✅ Loading new track: "${trackName}" (ID: ${trackId})`);

        const track = new AudioTrack(trackId, trackName, filePath, 0, 2, 44100);
        await track.loadMetadata();

        try {
            audioEngine.loadTrack(trackId, filePath);
            this.tracks.set(trackId, track);
            this.applyDefaultPanningToTrack(track);
            console.log(`Loaded track: ${trackName} (${track.duration.toFixed(2)}s)`);
            return trackId;
        } catch (error) {
            console.error(`Failed to load track into native engine: ${error}`);
            throw error;
        }
    }

    removeTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            audioEngine.setTrackVolume(trackId, 0);
            this.tracks.delete(trackId);
            return true;
        }
        return false;
    }

    clearAllTracks() {
        console.log('🧹 Clearing all tracks');
        audioEngine.stop();
        audioEngine.clearAllTracks();
        this.tracks.clear();
        this.songs.clear();
        this.currentSongId = null;
        console.log('✅ All tracks and songs cleared');

        if (serverInstance && serverInstance.io) {
            serverInstance.io.emit('tracks_cleared');
            serverInstance.io.emit('mixer_state_changed', this.getMixerState());
        }
    }

    async createSong(songName, trackPaths) {
        const songId = uuidv4();
        const trackIds = [];
        console.log(`🎵 Creating song: "${songName}" with ${trackPaths.length} tracks`);

        for (const trackPath of trackPaths) {
            try {
                const trackId = await this.loadTrack(trackPath);
                trackIds.push(trackId);
            } catch (error) {
                console.error(`Failed to load track ${trackPath} for song ${songName}:`, error);
            }
        }

        const song = {
            id: songId,
            name: songName,
            trackIds: trackIds,
            isPlaying: false
        };

        this.songs.set(songId, song);
        console.log(`✅ Created song: ${songName} (ID: ${songId})`);
        this.currentSongId = songId;
        return songId;
    }

    playSong(songId) {
        const song = this.songs.get(songId);
        if (!song) return;

        if (this.currentSongId && this.currentSongId !== songId) {
            this.stopSong(this.currentSongId);
        }

        console.log(`▶️  Playing song: ${song.name}`);

        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track) {
                audioEngine.setTrackVolume(trackId, track.isMuted ? 0 : track.volume);
                audioEngine.setTrackPan(trackId, track.pan);
                track.isPlaying = true;
            }
        }

        audioEngine.play();
        song.isPlaying = true;
        this.currentSongId = songId;
        this.isPlaying = true;
    }

    stopSong(songId) {
        const song = this.songs.get(songId);
        if (!song) return false;

        console.log(`⏹️  Stopping song: ${song.name}`);
        audioEngine.stop();

        for (const trackId of song.trackIds) {
            const track = this.tracks.get(trackId);
            if (track) track.isPlaying = false;
        }

        song.isPlaying = false;
        if (this.currentSongId === songId) {
            this.currentSongId = null;
            this.isPlaying = false;
        }
        return true;
    }

    removeSong(songId) {
        const song = this.songs.get(songId);
        if (!song) return false;

        this.stopSong(songId);
        for (const trackId of song.trackIds) {
            this.removeTrack(trackId);
        }
        this.songs.delete(songId);
        return true;
    }

    getSongState(songId) {
        const song = this.songs.get(songId);
        if (!song) return null;

        return {
            id: song.id,
            name: song.name,
            isPlaying: song.isPlaying,
            trackCount: song.trackIds.length,
            tracks: song.trackIds.map(trackId => {
                const track = this.tracks.get(trackId);
                return track ? track.getState() : null;
            }).filter(Boolean)
        };
    }

    getAllSongs() {
        const songs = [];
        for (const song of this.songs.values()) {
            songs.push(this.getSongState(song.id));
        }
        return songs;
    }

    playTrack(trackId) {
        // Individual track playback not fully supported in this engine mode alongside song
        // But we can enable it
        const track = this.tracks.get(trackId);
        if (track) {
            audioEngine.setTrackVolume(trackId, track.isMuted ? 0 : track.volume);
            audioEngine.play();
            track.isPlaying = true;
            return true;
        }
        return false;
    }

    stopTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            // We can't stop a single track in the engine (it stops all or we need to mute/pause it)
            // For now, we'll just mute it effectively? Or maybe we should expose pause?
            // The engine has pause().
            // If we want to stop just one track but keep others playing, we might need to unload it or mute it.
            // But 'stop' usually means rewind too.
            // For now, let's just mute it.
            audioEngine.setTrackVolume(trackId, 0);
            track.isPlaying = false;
            return true;
        }
        return false;
    }

    playAllTracks() {
        if (this.currentSongId) {
            this.playSong(this.currentSongId);
            return;
        }

        console.log('▶️  Playing all loaded tracks');
        for (const track of this.tracks.values()) {
            if (track) {
                audioEngine.setTrackVolume(track.id, track.isMuted ? 0 : track.volume);
                audioEngine.setTrackPan(track.id, track.pan);
                track.isPlaying = true;
            }
        }
        audioEngine.play();
        this.isPlaying = true;
    }

    stopAllTracks() {
        audioEngine.stop();
        for (const track of this.tracks.values()) {
            track.isPlaying = false;
        }
        this.isPlaying = false;

        if (serverInstance && serverInstance.io) {
            serverInstance.io.emit('mixer_state_changed', this.getMixerState());
        }
    }

    setTrackVolume(trackId, volume) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setVolume(volume);
            return true;
        }
        return false;
    }

    setTrackPan(trackId, pan) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setPan(pan);
            return true;
        }
        return false;
    }

    setTrackMute(trackId, muted) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.setMute(muted);
            return true;
        }
        return false;
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(2, volume));
        // TODO: Implement master volume in native engine or apply to all tracks
        // For now, iterate
        for (const track of this.tracks.values()) {
            // This logic is flawed if we want to maintain relative mix.
            // Native engine should have master volume.
            // I haven't implemented setMasterVolume in C++ yet.
            // I'll skip this for now or just store it.
        }
    }

    getMixerState() {
        return {
            masterVolume: this.masterVolume,
            isPlaying: this.isPlaying,
            currentSongId: this.currentSongId,
            songs: this.getAllSongs(),
            tracks: Array.from(this.tracks.values()).map(track => track.getState()),
            memoryUsage: this.getMemoryUsage()
        };
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            arrayBuffers: usage.arrayBuffers
        };
    }

    setCrossfadeDuration(duration) {
        this.crossfadeDuration = duration;
    }

    async crossfadeToNewTracks(newTrackPaths, fadeDuration = null) {
        // Simplify for now: Stop old, play new
        this.stopAllTracks();
        this.clearAllTracks();

        for (const path of newTrackPaths) {
            await this.loadTrack(path);
        }
        this.playAllTracks();
        return true;
    }

    applyDefaultPanning() {
        const trackArray = Array.from(this.tracks.values());
        const hasClickOrGuide = trackArray.some(track =>
            track.name.toLowerCase().includes('click') ||
            track.name.toLowerCase().includes('guide')
        );

        for (const track of trackArray) {
            const lowerName = track.name.toLowerCase();
            let panValue = 0;

            if (hasClickOrGuide) {
                if (lowerName.includes('click') || lowerName.includes('guide')) {
                    panValue = -1;
                } else {
                    panValue = 1;
                }
            }
            track.setPan(panValue);
        }
    }

    applyDefaultPanningToTrack(track) {
        // Re-run full panning logic finding context
        this.applyDefaultPanning();
    }
}

// Initialize Express app and Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:1420", "http://localhost:5174"], // Tauri dev server + Vite dev server
        methods: ["GET", "POST"]
    }
});

// Store io instance for crossfade emissions
const serverInstance = { io };

// Middleware
app.use(cors({
    origin: ["http://localhost:1420", "http://localhost:5174"] // Tauri dev server + Vite dev server
}));
app.use(express.json());

// Global mixer instance
const mixer = new AudioMixer();

// REST API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'harmonysync-audio-service',
        version: '1.0.0',
        memoryUsage: mixer.getMemoryUsage()
    });
});

app.post('/api/shutdown', (req, res) => {
    console.log('🛑 Shutdown request received');

    // If a shutdown token is configured, require it in the request
    if (SHUTDOWN_TOKEN) {
        const headerToken = req.headers['x-shutdown-token'] || (req.headers['authorization'] ? (req.headers['authorization'].split(' ')[1] || null) : null);
        if (!headerToken || headerToken !== SHUTDOWN_TOKEN) {
            console.warn('⚠️ Unauthorized shutdown attempt');
            return res.status(401).json({ status: 'unauthorized', message: 'Invalid or missing shutdown token' });
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

app.post('/api/tracks/load', async (req, res) => {
    try {
        const { filePath, name } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'filePath is required' });
        }

        const trackId = await mixer.loadTrack(filePath, name);
        const mixerState = mixer.getMixerState();

        // Emit to all connected clients
        io.emit('mixer_state_changed', mixerState);

        res.json({ trackId, success: true });
    } catch (error) {
        console.error('Error loading track:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracks/clear', (req, res) => {
    try {
        mixer.clearAllTracks();
        const mixerState = mixer.getMixerState();

        // Emit to all connected clients
        io.emit('mixer_state_changed', mixerState);

        res.json({ success: true, message: 'All tracks cleared' });
    } catch (error) {
        console.error('Error clearing tracks:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracks/:trackId/play', (req, res) => {
    const { trackId } = req.params;
    const success = mixer.playTrack(trackId);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/stop', (req, res) => {
    const { trackId } = req.params;
    const success = mixer.stopTrack(trackId);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/volume', (req, res) => {
    const { trackId } = req.params;
    const { volume } = req.body;

    const success = mixer.setTrackVolume(trackId, volume);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/pan', (req, res) => {
    const { trackId } = req.params;
    const { pan } = req.body;

    const success = mixer.setTrackPan(trackId, pan);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/tracks/:trackId/mute', (req, res) => {
    const { trackId } = req.params;
    const { muted } = req.body;

    const success = mixer.setTrackMute(trackId, muted);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.post('/api/mixer/play-all', (req, res) => {
    mixer.playAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/stop-all', (req, res) => {
    mixer.stopAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/master-volume', (req, res) => {
    const { volume } = req.body;
    mixer.setMasterVolume(volume);
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.post('/api/mixer/apply-default-panning', (req, res) => {
    mixer.applyDefaultPanning();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

app.get('/api/mixer/state', (req, res) => {
    res.json(mixer.getMixerState());
});

app.delete('/api/tracks/:trackId', (req, res) => {
    const { trackId } = req.params;
    const success = mixer.removeTrack(trackId);

    if (success) {
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Track not found' });
    }
});

app.delete('/api/mixer/clear', (req, res) => {
    mixer.clearAllTracks();
    io.emit('mixer_state_changed', mixer.getMixerState());
    res.json({ success: true });
});

// Crossfade endpoints
app.post('/api/mixer/crossfade', async (req, res) => {
    try {
        const { trackPaths, duration } = req.body;
        if (!trackPaths || !Array.isArray(trackPaths)) {
            return res.status(400).json({ error: 'trackPaths array is required' });
        }

        const success = await mixer.crossfadeToNewTracks(trackPaths, duration);
        res.json({ success });
    } catch (error) {
        console.error('Crossfade error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/mixer/crossfade-duration', (req, res) => {
    const { duration } = req.body;
    if (typeof duration !== 'number' || duration < 100 || duration > 10000) {
        return res.status(400).json({ error: 'Duration must be between 100ms and 10000ms' });
    }

    mixer.setCrossfadeDuration(duration);
    res.json({ success: true, duration: mixer.crossfadeDuration });
});

app.get('/api/mixer/crossfade-status', (req, res) => {
    res.json({
        isActive: !!mixer.activeCrossfade,
        crossfade: mixer.activeCrossfade,
        defaultDuration: mixer.crossfadeDuration
    });
});

// Song management endpoints
app.post('/api/songs/create', async (req, res) => {
    try {
        const { name, trackPaths } = req.body;
        if (!name || !trackPaths || !Array.isArray(trackPaths)) {
            return res.status(400).json({ error: 'name and trackPaths array are required' });
        }

        const songId = await mixer.createSong(name, trackPaths);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true, songId });
    } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/songs/:songId/play', (req, res) => {
    try {
        const { songId } = req.params;
        mixer.playSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success: true });
    } catch (error) {
        console.error('Error playing song:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/songs/:songId/stop', (req, res) => {
    try {
        const { songId } = req.params;
        const success = mixer.stopSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success });
    } catch (error) {
        console.error('Error stopping song:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/songs/:songId', (req, res) => {
    try {
        const { songId } = req.params;
        const success = mixer.removeSong(songId);
        io.emit('mixer_state_changed', mixer.getMixerState());
        res.json({ success });
    } catch (error) {
        console.error('Error removing song:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/songs', (req, res) => {
    try {
        const songs = mixer.getAllSongs();
        res.json({ success: true, songs });
    } catch (error) {
        console.error('Error getting songs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/songs/:songId', (req, res) => {
    try {
        const { songId } = req.params;
        const song = mixer.getSongState(songId);
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json({ success: true, song });
    } catch (error) {
        console.error('Error getting song:', error);
        res.status(500).json({ error: error.message });
    }
});

// Socket.IO for real-time communication
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current mixer state to new client
    socket.emit('mixer_state_changed', mixer.getMixerState());

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });

    // Handle real-time commands via WebSocket
    socket.on('load_track', async (data) => {
        try {
            const trackId = await mixer.loadTrack(data.filePath, data.name);
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_loaded', { trackId, success: true });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('play_track', (data) => {
        const success = mixer.playTrack(data.trackId);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
        }
    });

    socket.on('stop_track', (data) => {
        const success = mixer.stopTrack(data.trackId);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
        }
    });

    // Track control events
    socket.on('set_track_mute', (data) => {
        console.log(`🔇 Setting track ${data.trackId} mute to ${data.muted}`);
        const success = mixer.setTrackMute(data.trackId, data.muted);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_mute_changed', { trackId: data.trackId, muted: data.muted, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track mute: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_pan', (data) => {
        console.log(`🎛️ Setting track ${data.trackId} pan to ${data.pan}`);
        const success = mixer.setTrackPan(data.trackId, data.pan);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_pan_changed', { trackId: data.trackId, pan: data.pan, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track pan: track ${data.trackId} not found` });
        }
    });

    socket.on('set_track_volume', (data) => {
        console.log(`🎚️ Setting track ${data.trackId} volume to ${data.volume}`);
        const success = mixer.setTrackVolume(data.trackId, data.volume);
        if (success) {
            io.emit('mixer_state_changed', mixer.getMixerState());
            socket.emit('track_volume_changed', { trackId: data.trackId, volume: data.volume, success: true });
        } else {
            socket.emit('error', { message: `Failed to set track volume: track ${data.trackId} not found` });
        }
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Another audio service may be running.`);
        console.error('💡 Please stop the existing service or use a different port.');
        process.exit(1);
    } else {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3001;

// Bind explicitly to localhost to avoid exposing the service on external interfaces
server.listen(PORT, HOST, () => {
    console.log(`🎵 HarmonySync Audio Service running on http://${HOST}:${PORT}`);
    console.log(`🔗 REST API: http://${HOST}:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Another audio service may be running.`);
        console.error('💡 Try running: pkill -f "harmonysync-audio-service" to stop existing service');
        process.exit(1);
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});

module.exports = { app, server, mixer };