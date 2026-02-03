// harmonysync/src/utils/audio/nodejs-audio-client.ts
// Client interface for communicating with the Node.js audio service

import io, { Socket } from 'socket.io-client';
import { core } from '../../electron-adapter';
import * as audioApi from '../api';
import type { 
    MixerState, 
    MemoryUsage,
    CrossfadeStatus,
    FormattedMemoryUsage,
    FormattedMixerState,
    BatchTrackResult,
    CreateSongRequest
} from '../../types/audio';
import type { EventHandler } from '../../types/events';

class NodeJSAudioClient {
    private socket: Socket | null = null;
    public isConnected = false;
    private audioServiceUrl = 'http://localhost:3001';
    private eventHandlers: Map<string, Array<EventHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;

    /**
     * Initialize connection to audio service
     */
    async connect(): Promise<boolean> {
        try {
            console.log('Connecting to Node.js audio service...');
            
            this.socket = io(this.audioServiceUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket initialization failed'));
                    return;
                }

                this.socket.on('connect', () => {
                    console.log('✅ Connected to audio service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventHandlers();
                    resolve(true);
                });

                this.socket.on('connect_error', (error: Error) => {
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

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('mixer_state_changed', (state: MixerState) => {
            this.emit('mixerStateChanged', state);
        });

        this.socket.on('track_loaded', (data: unknown) => {
            this.emit('trackLoaded', data);
        });

        this.socket.on('tracks_cleared', () => {
            this.emit('tracksCleared', undefined);
        });

        this.socket.on('crossfade_progress', (data: unknown) => {
            this.emit('crossfadeProgress', data);
        });

        this.socket.on('crossfade_complete', (data: unknown) => {
            this.emit('crossfadeComplete', data);
        });

        this.socket.on('playback_complete', (data: unknown) => {
            this.emit('playbackComplete', data);
        });

        this.socket.on('playback_ready', (data: unknown) => {
            this.emit('playbackReady', data);
        });

        this.socket.on('error', (error: unknown) => {
            this.emit('error', error);
        });
    }

    private async handleReconnection(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('connectionLost', undefined);
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

    /**
     * Event handling
     */
    on(event: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    off(event: string, handler: EventHandler): void {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }
    }

    private emit(event: string, data: unknown): void {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event)?.forEach(handler => {
                try {
                    handler(data as never);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Audio service methods (delegated to typed API client where possible)
     */
    async checkHealth(): Promise<{ status: string; memoryUsage?: MemoryUsage; version?: string }> {
        const health = await audioApi.health();
        return { status: health.status, memoryUsage: undefined, version: undefined };
    }

    async loadTrack(filePath: string): Promise<string> {
        const response = await audioApi.loadTrack({ path: filePath });
        return response.trackId;
    }

    async playTrack(trackId: string): Promise<void> {
        return audioApi.playTrack(trackId);
    }

    async stopTrack(trackId: string): Promise<void> {
        return audioApi.stopTrack(trackId);
    }

    async setTrackVolume(trackId: string, volume: number): Promise<void> {
        return audioApi.setTrackVolume(trackId, { trackId, volume });
    }

    async setTrackPan(trackId: string, pan: number): Promise<void> {
        return audioApi.setTrackPan(trackId, { trackId, pan });
    }

    async setTrackMute(trackId: string, muted: boolean): Promise<void> {
        return audioApi.muteTrack(trackId, { trackId, muted });
    }

    async playAllTracks(): Promise<void> {
        return audioApi.playAll();
    }

    async stopAllTracks(): Promise<void> {
        return audioApi.stopAll();
    }

    async setMasterVolume(volume: number): Promise<void> {
        return audioApi.setMasterVolume({ trackId: '', volume });
    }

    async applyDefaultPanning(): Promise<void> {
        return audioApi.applyDefaultPanning();
    }

    async getMixerState(): Promise<MixerState> {
        const state = await audioApi.getMixerState();
        return { 
            tracks: state.tracks.map(t => ({
                id: t.id,
                name: t.name,
                filePath: '',
                isPlaying: false,
                isPaused: false,
                panValue: t.pan,
                volume: t.volume,
                isMuted: t.isMuted
            })),
            memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 } 
        };
    }

    async removeTrack(trackId: string): Promise<void> {
        return audioApi.removeTrack(trackId);
    }

    async clearAllTracks(): Promise<void> {
        return audioApi.clearMixer();
    }

    /**
     * Crossfade methods — use typed client for crossfade that supports trackPaths
     */
    async crossfadeToTracks(duration: number | null = null): Promise<void> {
        const body = { duration: duration || 3000 };
        return audioApi.crossfade(body);
    }

    async setCrossfadeDuration(duration: number): Promise<void> {
        return audioApi.setCrossfadeDuration(duration);
    }

    async getCrossfadeStatus(): Promise<CrossfadeStatus> {
        const status = await audioApi.getCrossfadeStatus();
        return { 
            isActive: status.active, 
            progress: status.remaining_ms ? 1 - (status.remaining_ms / 3000) : 0 
        };
    }

    /**
     * WebSocket methods (real-time)
     */
    loadTrackRealTime(filePath: string, name: string | null = null): void {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket?.emit('load_track', { filePath, name });
    }

    playTrackRealTime(trackId: string): void {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket?.emit('play_track', { trackId });
    }

    stopTrackRealTime(trackId: string): void {
        if (!this.isConnected) {
            throw new Error('Not connected to audio service');
        }
        this.socket?.emit('stop_track', { trackId });
    }

    /**
     * Utility methods
     */
    async waitForConnection(timeoutMs = 10000): Promise<boolean> {
        if (this.isConnected) {
            return true;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeoutMs);

            const checkConnection = (): void => {
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

    async testConnection(): Promise<boolean> {
        try {
            await this.checkHealth();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.eventHandlers.clear();
    }

    /**
     * Memory monitoring
     */
    async getMemoryUsage(): Promise<MemoryUsage | null> {
        try {
            const health = await this.checkHealth();
            return health.memoryUsage || null;
        } catch (error) {
            console.error('Failed to get memory usage:', error);
            return null;
        }
    }

    /**
     * Load multiple tracks (batch operation)
     */
    async loadMultipleTracks(trackPaths: string[]): Promise<BatchTrackResult[]> {
        const results: BatchTrackResult[] = [];
        for (const path of trackPaths) {
            try {
                const trackId = await this.loadTrack(path);
                results.push({ path, trackId, success: true });
            } catch (error) {
                const err = error as Error;
                console.error(`Failed to load track ${path}:`, error);
                results.push({ path, error: err.message, success: false });
            }
        }
        return results;
    }

    /**
     * Get formatted state for UI
     */
    async getFormattedState(): Promise<FormattedMixerState | null> {
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

    formatMemoryUsage(usage: MemoryUsage | undefined): FormattedMemoryUsage {
        if (!usage) {
            return {
                rss: 'Unknown',
                heapUsed: 'Unknown',
                heapTotal: 'Unknown',
                total: 'Unknown'
            };
        }
        
        const mb = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);
        
        return {
            rss: `${mb(usage.rss)}MB`,
            heapUsed: `${mb(usage.heapUsed)}MB`,
            heapTotal: `${mb(usage.heapTotal)}MB`,
            total: `${mb(usage.rss)}MB`
        };
    }

    /**
     * Backend command to start the audio service
     */
    async startAudioService(): Promise<unknown> {
        try {
            console.log('🎵 Starting audio service via Electron backend...');
            const result = await core.invoke('start_audio_service');
            console.log('✅ Audio service start result:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to start audio service:', error);
            throw error;
        }
    }

    /**
     * Backend command to check audio service status
     */
    async checkAudioServiceStatus(): Promise<boolean> {
        try {
            const isRunning = await core.invoke('check_audio_service_status');
            return isRunning as boolean;
        } catch (error) {
            console.error('❌ Failed to check audio service status:', error);
            return false;
        }
    }

    /**
     * Song management methods
     */
    async createSong(name: string, trackPaths: string[]): Promise<unknown> {
        const request: CreateSongRequest = { name, trackPaths };
        return audioApi.createSong(request);
    }

    async playSong(songId: string): Promise<void> {
        return audioApi.playSong(songId);
    }

    async stopSong(songId: string): Promise<void> {
        return audioApi.stopSong(songId);
    }

    async removeSong(songId: string): Promise<void> {
        return audioApi.removeSong(songId);
    }

    async getSongs(): Promise<unknown> {
        return audioApi.getSongs();
    }

    async getSong(songId: string): Promise<unknown> {
        return audioApi.getSong(songId);
    }
}

export default NodeJSAudioClient;
