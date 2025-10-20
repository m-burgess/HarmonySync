// harmonysync/src/utils/audio/nodejs-audio-client.js
// Client interface for communicating with the Node.js audio service

import io from 'socket.io-client';
import { invoke } from '@tauri-apps/api/core';

class NodeJSAudioClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.audioServiceUrl = 'http://localhost:3001';
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    // Initialize connection to audio service
    async connect() {
        try {
            console.log('Connecting to Node.js audio service...');
            
            this.socket = io(this.audioServiceUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    console.log('✅ Connected to audio service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventHandlers();
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Audio service connection error:', error);
                    this.isConnected = false;
                    reject(error);
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Disconnected from audio service');
                    this.isConnected = false;
                    this.handleReconnection();
                });

                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Failed to connect to audio service:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        this.socket.on('mixer_state_changed', (state) => {
            this.emit('mixerStateChanged', state);
        });

        this.socket.on('track_loaded', (data) => {
            this.emit('trackLoaded', data);
        });

        this.socket.on('tracks_cleared', () => {
            this.emit('tracksCleared');
        });

        this.socket.on('crossfade_progress', (data) => {
            this.emit('crossfadeProgress', data);
        });

        this.socket.on('crossfade_complete', (data) => {
            this.emit('crossfadeComplete', data);
        });

        this.socket.on('playback_complete', (data) => {
            this.emit('playbackComplete', data);
        });

        this.socket.on('error', (error) => {
            this.emit('error', error);
        });
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('connectionLost');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, this.reconnectDelay);
    }

    // Event handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // REST API methods
    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.audioServiceUrl}/api${endpoint}`;
            console.log(`🌐 [makeRequest] Making request to: ${url}`, options);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [makeRequest] HTTP ${response.status}: ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [makeRequest] Success response:`, result);
            return result;
        } catch (error) {
            console.error(`❌ [makeRequest] Failed:`, error);
            throw error;
        }
    }

    // Audio service methods
    async checkHealth() {
        return this.makeRequest('/health');
    }

    async loadTrack(filePath, name = null) {
        const response = await this.makeRequest('/tracks/load', {
            method: 'POST',
            body: JSON.stringify({ filePath, name })
        });
        return response.trackId;
    }

    async playTrack(trackId) {
        return this.makeRequest(`/tracks/${trackId}/play`, {
            method: 'POST'
        });
    }

    async stopTrack(trackId) {
        return this.makeRequest(`/tracks/${trackId}/stop`, {
            method: 'POST'
        });
    }

    async setTrackVolume(trackId, volume) {
        return this.makeRequest(`/tracks/${trackId}/volume`, {
            method: 'POST',
            body: JSON.stringify({ volume })
        });
    }

    async setTrackPan(trackId, pan) {
        return this.makeRequest(`/tracks/${trackId}/pan`, {
            method: 'POST',
            body: JSON.stringify({ pan })
        });
    }

    async setTrackMute(trackId, muted) {
        return this.makeRequest(`/tracks/${trackId}/mute`, {
            method: 'POST',
            body: JSON.stringify({ muted })
        });
    }

    async playAllTracks() {
        return this.makeRequest('/mixer/play-all', {
            method: 'POST'
        });
    }

    async stopAllTracks() {
        return this.makeRequest('/mixer/stop-all', {
            method: 'POST'
        });
    }

    async setMasterVolume(volume) {
        return this.makeRequest('/mixer/master-volume', {
            method: 'POST',
            body: JSON.stringify({ volume })
        });
    }

    async applyDefaultPanning() {
        return this.makeRequest('/mixer/apply-default-panning', {
            method: 'POST'
        });
    }

    async getMixerState() {
        return this.makeRequest('/mixer/state');
    }

    async removeTrack(trackId) {
        return this.makeRequest(`/tracks/${trackId}`, {
            method: 'DELETE'
        });
    }

    async clearAllTracks() {
        return this.makeRequest('/mixer/clear', {
            method: 'DELETE'
        });
    }

    // Crossfade methods
    async crossfadeToTracks(trackPaths, duration = null) {
        return this.makeRequest('/mixer/crossfade', {
            method: 'POST',
            body: JSON.stringify({ trackPaths, duration })
        });
    }

    async setCrossfadeDuration(duration) {
        return this.makeRequest('/mixer/crossfade-duration', {
            method: 'POST',
            body: JSON.stringify({ duration })
        });
    }

    async getCrossfadeStatus() {
        return this.makeRequest('/mixer/crossfade-status');
    }

    // WebSocket methods (real-time)
    loadTrackRealTime(filePath, name = null) {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket.emit('load_track', { filePath, name });
    }

    playTrackRealTime(trackId) {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket.emit('play_track', { trackId });
    }

    stopTrackRealTime(trackId) {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket.emit('stop_track', { trackId });
    }

    // Utility methods
    async waitForConnection(timeoutMs = 10000) {
        if (this.isConnected) {
            return true;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeoutMs);

            const checkConnection = () => {
                if (this.isConnected) {
                    clearTimeout(timeout);
                    resolve(true);
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    async testConnection() {
        try {
            await this.checkHealth();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.eventHandlers.clear();
    }

    // Memory monitoring
    async getMemoryUsage() {
        try {
            const health = await this.checkHealth();
            return health.memoryUsage;
        } catch (error) {
            console.error('Failed to get memory usage:', error);
            return null;
        }
    }

    // Load multiple tracks (batch operation)
    async loadMultipleTracks(trackPaths) {
        const results = [];
        for (const path of trackPaths) {
            try {
                const trackId = await this.loadTrack(path);
                results.push({ path, trackId, success: true });
            } catch (error) {
                console.error(`Failed to load track ${path}:`, error);
                results.push({ path, error: error.message, success: false });
            }
        }
        return results;
    }

    // Get formatted state for UI
    async getFormattedState() {
        try {
            const state = await this.getMixerState();
            return {
                ...state,
                memoryUsageFormatted: this.formatMemoryUsage(state.memoryUsage),
                tracksCount: state.tracks.length,
                playingTracksCount: state.tracks.filter(t => t.isPlaying).length
            };
        } catch (error) {
            console.error('Failed to get formatted state:', error);
            return null;
        }
    }

    formatMemoryUsage(usage) {
        if (!usage) return 'Unknown';
        
        const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
        
        return {
            rss: `${mb(usage.rss)}MB`,
            heapUsed: `${mb(usage.heapUsed)}MB`,
            heapTotal: `${mb(usage.heapTotal)}MB`,
            total: `${mb(usage.rss)}MB`
        };
    }

    // Tauri command to start the audio service
    async startAudioService() {
        try {
            console.log('🎵 Starting audio service via Tauri...');
            const result = await invoke('start_audio_service');
            console.log('✅ Audio service start result:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to start audio service:', error);
            throw error;
        }
    }

    // Tauri command to check audio service status
    async checkAudioServiceStatus() {
        try {
            const isRunning = await invoke('check_audio_service_status');
            return isRunning;
        } catch (error) {
            console.error('❌ Failed to check audio service status:', error);
            return false;
        }
    }
}

export default NodeJSAudioClient;