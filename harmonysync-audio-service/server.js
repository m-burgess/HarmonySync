const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { parseFile } = require('music-metadata');
const wav = require('node-wav');
const { spawn } = require('child_process');

class AudioTrack {
    constructor(id, name, filePath, duration, channels, sampleRate) {
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

    createStream() {
        if (this.stream) {
            this.stream.destroy();
        }

        // Create a streaming reader for the audio file
        // We'll use fluent-ffmpeg for format conversion and streaming
        this.stream = fs.createReadStream(this.filePath);
        
        return this.stream;
    }

    play() {
        console.log(`⚠️  Warning: Individual track play() called for ${this.name}. Use mixer.playAllTracks() for synchronized playback.`);
        
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        console.log(`▶️  Playing individual track: ${this.name}`);
        
        // Use system audio player for immediate playback
        try {
            // Try different audio players based on what's available
            let playerCmd = 'aplay'; // Default for Linux
            let playerArgs = [this.filePath];
            
            // Check if we can use mpv (better format support)
            if (this.checkCommand('mpv')) {
                playerCmd = 'mpv';
                playerArgs = [
                    '--no-video',
                    '--volume=' + Math.round(this.volume * 100),
                    this.filePath
                ];
            } else if (this.checkCommand('ffplay')) {
                playerCmd = 'ffplay';
                playerArgs = [
                    '-nodisp',
                    '-autoexit',
                    '-volume', Math.round(this.volume * 100),
                    this.filePath
                ];
            } else if (this.checkCommand('paplay')) {
                playerCmd = 'paplay';
                playerArgs = [this.filePath];
            }
            
            this.audioProcess = spawn(playerCmd, playerArgs);
            
            this.audioProcess.on('close', (code) => {
                console.log(`🏁 Track finished: ${this.name} (exit code: ${code})`);
                this.isPlaying = false;
                this.audioProcess = null;
            });
            
            this.audioProcess.on('error', (error) => {
                console.error(`❌ Audio playback error for ${this.name}:`, error);
                this.isPlaying = false;
                this.audioProcess = null;
            });
            
        } catch (error) {
            console.error(`❌ Failed to start playback for ${this.name}:`, error);
            this.isPlaying = false;
        }
    }

    checkCommand(cmd) {
        try {
            require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.audioProcess) {
            this.audioProcess.kill('SIGTERM');
            this.audioProcess = null;
        }
        if (this.stream) {
            this.stream.destroy();
            this.stream = null;
        }
        console.log(`⏹️  Stopped track: ${this.name}`);
    }

    pause() {
        // Implement pause logic
        this.isPlaying = false;
    }

    resume() {
        // Implement resume logic
        this.isPlaying = true;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(2, volume)); // 0-200%
        
        // Apply volume to running mpv process (only if not muted)
        if (this.audioProcess && !this.audioProcess.killed && !this.isMuted) {
            try {
                const mpvVolume = this.volume * 100;
                const command = `{ "command": ["set_property", "volume", ${mpvVolume}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🎚️ Applied volume=${this.volume} (mpv=${mpvVolume}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply volume to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply volume to track ${this.name}:`, error.message);
            }
        }
    }

    setPan(pan) {
        this.pan = Math.max(-1, Math.min(1, pan)); // -1 to 1
        
        // Apply pan to running mpv process
        if (this.audioProcess && !this.audioProcess.killed) {
            try {
                // Convert pan (-1 to 1) to mpv audio-balance (-1 to 1)
                const audioBalance = pan;
                const command = `{ "command": ["set_property", "audio-balance", ${audioBalance}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🎛️ Applied pan=${pan} (audio-balance=${audioBalance}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply pan to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply pan to track ${this.name}:`, error.message);
            }
        } else {
            console.log(`🎛️ Track ${this.name} not playing, pan state saved for next playback`);
        }
    }

    setMute(muted) {
        this.isMuted = muted;
        
        // Apply mute to running mpv process
        if (this.audioProcess && !this.audioProcess.killed) {
            const volume = muted ? 0 : (this.volume * 100);
            try {
                // Send volume command to mpv via stdin (mpv accepts JSON commands)
                const command = `{ "command": ["set_property", "volume", ${volume}] }\n`;
                if (this.audioProcess.stdin && this.audioProcess.stdin.writable) {
                    this.audioProcess.stdin.write(command);
                    console.log(`🔇 Applied mute=${muted} (volume=${volume}) to track: ${this.name}`);
                } else {
                    console.log(`⚠️ Cannot apply mute to ${this.name}: stdin not writable`);
                }
            } catch (error) {
                console.error(`❌ Failed to apply mute to track ${this.name}:`, error.message);
            }
        } else {
            console.log(`🔇 Track ${this.name} not playing, mute state saved for next playback`);
        }
    }

    applyEffects(audioStream) {
        // Apply real-time volume and panning effects
        // This is a simplified version - in production you'd use proper audio processing
        return audioStream;
    }

    getState() {
        return {
            id: this.id,
            name: this.name,
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

class AudioMixer {
    constructor() {
        this.tracks = new Map();
        this.masterVolume = 1.0;
        this.isPlaying = false;
        this.speaker = null;
        this.mixedStream = null;
        this.crossfadeDuration = 3000; // 3 seconds default crossfade
        this.activeCrossfade = null;
    }

    async loadTrack(filePath, name = null) {
        console.log(`🎵 LoadTrack called: "${filePath}" (name: ${name})`);
        
        // Check if track already exists
        const existingTrack = Array.from(this.tracks.values()).find(track => track.filePath === filePath);
        if (existingTrack) {
            console.log(`⚠️  Track already loaded: ${existingTrack.name} (ID: ${existingTrack.id}) - skipping duplicate`);
            return existingTrack.id;
        }
        
        const trackId = uuidv4();
        const trackName = name || path.basename(filePath, path.extname(filePath));
        
        console.log(`✅ Loading new track: "${trackName}" (ID: ${trackId})`);
        
        const track = new AudioTrack(trackId, trackName, filePath, 0, 2, 44100);
        
        const loaded = await track.loadMetadata();
        if (!loaded) {
            throw new Error(`Failed to load track: ${filePath}`);
        }

        this.tracks.set(trackId, track);
        console.log(`Loaded track: ${trackName} (${track.duration.toFixed(2)}s)`);
        
        return trackId;
    }

    removeTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.stop();
            this.tracks.delete(trackId);
            return true;
        }
        return false;
    }

    clearAllTracks() {
        console.log('🧹 Clearing all tracks');
        this.stopAllTracks();
        
        for (const track of this.tracks.values()) {
            track.stop();
        }
        
        this.tracks.clear();
        console.log('✅ All tracks cleared');
    }

    playTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.play();
            return true;
        }
        return false;
    }

    stopTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.stop();
            return true;
        }
        return false;
    }

    async playAllTracks() {
        // Stop any currently playing tracks first
        this.stopAllTracks();
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        
        const activeTracks = [];
        
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
            track.name.toLowerCase().includes('metronome')
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

    async startMasterClockPlayback(tracks, masterTrack) {
        try {
            // Start the master clock track first
            console.log(`🎯 Starting master clock: ${masterTrack.name}`);
            console.log(`🔍 Master track path: ${masterTrack.filePath}`);
            
            await this.startTrackWithClock(masterTrack, true);
            
            // Wait a tiny bit for the master to establish
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if master is still running after a brief moment
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!masterTrack.isPlaying) {
                console.warn('⚠️ Master clock failed to start properly, switching to synchronized playback');
                throw new Error('Master clock failed');
            }
            
            // Start all other tracks simultaneously, synchronized to master
            const slavePromises = tracks
                .filter(track => track !== masterTrack)
                .map(track => this.startTrackWithClock(track, false));
            
            await Promise.all(slavePromises);
            
            console.log('✅ All tracks started with master clock synchronization');
            
        } catch (error) {
            console.error('❌ Error in master clock playback:', error);
            console.log('🔄 Falling back to synchronized simultaneous playback');
            // Fallback to simultaneous playback
            await this.startSynchronizedSimultaneousPlayback(tracks);
        }
    }

    async startSynchronizedSimultaneousPlayback(tracks) {
        try {
            // Start all tracks as close to simultaneously as possible
            const startTime = Date.now();
            const promises = tracks.map((track, index) => 
                this.startTrackWithDelay(track, index * 10) // 10ms stagger to prevent audio driver conflicts
            );
            
            await Promise.all(promises);
            
            const totalTime = Date.now() - startTime;
            console.log(`✅ All ${tracks.length} tracks started simultaneously in ${totalTime}ms`);
            
        } catch (error) {
            console.error('❌ Error in synchronized playback:', error);
            throw error;
        }
    }

    startTrackWithClock(track, isMaster) {
        return new Promise((resolve, reject) => {
            try {
                const playerCmd = 'mpv';
                
                // Calculate initial volume based on mute state
                const initialVolume = track.isMuted ? 0 : Math.round(track.volume * 100);
                
                // Calculate audio balance from pan (-1 to 1)
                const audioBalance = track.pan || 0;
                
                const playerArgs = [
                    '--no-video',
                    '--keep-open=no',
                    '--really-quiet',
                    '--volume=' + initialVolume,
                    '--audio-balance=' + audioBalance,  // Apply pan at startup
                    '--audio-channels=stereo',
                    '--audio-device=auto',
                    '--ao=pulse,alsa,oss',  // Try multiple audio outputs
                    '--gapless-audio=yes',
                    '--input-terminal=no',  // Disable terminal input
                    '--input-default-bindings=no',  // Disable default key bindings
                    '--input-ipc-server=/tmp/mpv-socket-' + track.id,  // Enable IPC for runtime control
                ];
                
                console.log(`🎛️ Starting track ${track.name} with volume=${initialVolume}, pan=${audioBalance}, muted=${track.isMuted}`);
                
                // Master clock gets priority and real-time scheduling
                if (isMaster) {
                    playerArgs.push('--priority=realtime');
                    playerArgs.push('--audio-latency-hacks=yes');
                    playerArgs.push('--audio-buffer=0.1');  // Lower buffer for tight timing
                } else {
                    playerArgs.push('--audio-buffer=0.2');  // Slightly higher buffer for slaves
                }
                
                playerArgs.push(track.filePath);
                
                console.log(`🎵 Starting ${isMaster ? 'MASTER' : 'slave'} track: ${track.name}`);
                console.log(`   Command: mpv ${playerArgs.join(' ')}`);
                
                track.audioProcess = spawn(playerCmd, playerArgs, {
                    stdio: ['pipe', 'pipe', 'pipe']  // Enable stdin for IPC control
                });
                track.isPlaying = true;
                
                // Log any stderr output for debugging
                track.audioProcess.stderr.on('data', (data) => {
                    console.error(`🔊 ${track.name} stderr: ${data.toString().trim()}`);
                });
                
                track.audioProcess.on('close', (code) => {
                    console.log(`🏁 Track finished: ${track.name} (exit code: ${code})`);
                    track.isPlaying = false;
                    track.audioProcess = null;
                    
                    // Check if all tracks have finished
                    const allTracksFinished = !Array.from(this.tracks.values()).some(t => t.isPlaying);
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
                    
                    // If master track stops with error code, try fallback
                    if (isMaster && code !== 0) {
                        console.error(`❌ Master clock failed with exit code ${code}, trying fallback playback`);
                        // Don't stop all tracks immediately, let them continue for a bit
                        setTimeout(() => {
                            if (this.isPlaying) {
                                console.log('🔄 Master clock failed, switching to synchronized playback mode');
                                // Don't stop everything, just log the issue
                            }
                        }, 1000);
                    } else if (isMaster && code === 0) {
                        console.log('🛑 Master clock completed normally, stopping all tracks');
                        this.stopAllTracks();
                    }
                });
                
                track.audioProcess.on('error', (error) => {
                    console.error(`❌ Audio playback error for ${track.name}:`, error);
                    track.isPlaying = false;
                    track.audioProcess = null;
                    
                    if (isMaster) {
                        console.error(`❌ Master clock failed to start: ${error.message}`);
                        // Try to continue with slave tracks
                        setTimeout(() => {
                            console.log('🔄 Continuing with slave tracks after master failure');
                        }, 500);
                    }
                    
                    reject(error);
                });
                
                // Resolve immediately after starting
                resolve();
                
            } catch (error) {
                console.error(`❌ Failed to start playback for ${track.name}:`, error);
                track.isPlaying = false;
                reject(error);
            }
        });
    }

    startTrackWithDelay(track, delayMs) {
        return new Promise((resolve) => {
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

    checkCommand(cmd) {
        try {
            require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    stopAllTracks() {
        console.log('🛑 Stopping all tracks');
        
        // Stop individual track processes
        for (const track of this.tracks.values()) {
            if (track.audioProcess) {
                try {
                    track.audioProcess.kill('SIGTERM');
                    console.log(`⏹️ Stopped track: ${track.name}`);
                } catch (error) {
                    console.error(`❌ Error stopping track ${track.name}:`, error);
                }
            }
            track.isPlaying = false;
            track.audioProcess = null;
        }
        
        this.isPlaying = false;
        
        // Emit state change
        if (serverInstance.io) {
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
    }

    getMixerState() {
        return {
            masterVolume: this.masterVolume,
            isPlaying: this.isPlaying,
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

    clearAllTracks() {
        this.stopAllTracks();
        this.tracks.clear();
        
        // Emit track list update
        if (serverInstance.io) {
            serverInstance.io.emit('tracks_cleared');
            serverInstance.io.emit('mixer_state_changed', this.getMixerState());
        }
    }

    setCrossfadeDuration(duration) {
        this.crossfadeDuration = Math.max(100, Math.min(10000, duration)); // 100ms to 10s
    }

    async crossfadeToNewTracks(newTrackPaths, fadeDuration = null) {
        const fadeTime = fadeDuration || this.crossfadeDuration;
        
        console.log(`🎵 Starting crossfade transition (${fadeTime}ms)`);
        
        try {
            // Store current playing tracks
            const currentTracks = Array.from(this.tracks.values()).filter(t => t.isPlaying);
            
            // Load new tracks
            const newTrackIds = [];
            for (const path of newTrackPaths) {
                try {
                    const trackId = await this.loadTrack(path);
                    newTrackIds.push(trackId);
                } catch (error) {
                    console.error(`Failed to load track for crossfade: ${path}`, error);
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
                    const originalVolume = track.volume;
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

    async performCrossfade() {
        if (!this.activeCrossfade) {
            console.warn('No active crossfade to perform');
            return;
        }
        
        try {
            const { startTime, duration, oldTracks, newTracks } = this.activeCrossfade;
            const steps = 50; // 50 steps for smooth fade
            const stepDuration = duration / steps;
            
            for (let i = 0; i <= steps; i++) {
                // Check if crossfade was cancelled
                if (!this.activeCrossfade) {
                    console.log('Crossfade was cancelled');
                    return;
                }
                
                const progress = i / steps; // 0 to 1
                const fadeOutVolume = 1 - progress; // 1 to 0
                const fadeInVolume = progress; // 0 to 1
                
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

    applyDefaultPanning() {
        const trackArray = Array.from(this.tracks.values());
        const hasClickOrGuide = trackArray.some(track => 
            track.name.toLowerCase().includes('click') || 
            track.name.toLowerCase().includes('guide')
        );

        for (const track of trackArray) {
            const lowerName = track.name.toLowerCase();
            let panValue = 0; // Center by default

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

server.listen(PORT, () => {
    console.log(`🎵 HarmonySync Audio Service running on port ${PORT}`);
    console.log(`🔗 REST API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
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