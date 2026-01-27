// Updated audio.ts that uses Node.js audio service instead of FFmpeg/Symphonia
import NodeJSAudioClient from './nodejs-audio-client';
import AudioServiceChecker from './service-checker';
import * as audioApi from '../api';
import type { 
    Track, 
    MixerState, 
    EventHandler,
    ServiceStatus,
    MemoryUsage,
    HealthResponse,
    CrossfadeStatus,
    BatchTrackResult,
    StartupInstructions
} from '../../types/audio';

// Event handlers map type
interface EventHandlersMap {
    playbackComplete: Array<EventHandler<PlaybackCompleteData>>;
    crossfadeComplete: Array<EventHandler<CrossfadeCompleteData>>;
}

// Event data types
interface PlaybackCompleteData {
    trackId?: string;
    [key: string]: unknown;
}

interface CrossfadeCompleteData {
    newTracks: Track[];
    [key: string]: unknown;
}

interface CrossfadeProgressData {
    progress: number;
    [key: string]: unknown;
}

interface CreateSongResult {
    songId: string;
    tracks: Track[];
}

interface TrackLoadResult {
    path: string;
    trackId: string;
    name: string;
    success: boolean;
}

interface MemoryUsageResult {
    rss: number;
    heapUsed: number;
    formatted: string;
}

interface CrossfadeResult {
    success: boolean;
    [key: string]: unknown;
}

interface ClearTracksResult {
    success: boolean;
}

// Global audio client instance
let audioClient: NodeJSAudioClient | null = null;
let serviceChecker: AudioServiceChecker | null = null;
let tracks: Track[] = [];
let isInitialized = false;
let eventHandlers: EventHandlersMap = {
    playbackComplete: [],
    crossfadeComplete: []
};

// Initialize the Node.js audio service connection
export async function initializeAudioService(): Promise<NodeJSAudioClient> {
    if (isInitialized && audioClient && audioClient.isConnected) {
        return audioClient;
    }

    try {
        console.log('🎵 Initializing Node.js Audio Service...');
        
        // Initialize service checker
        if (!serviceChecker) {
            serviceChecker = new AudioServiceChecker();
        }
        
        // Check if service is running
        const status: ServiceStatus = await serviceChecker.checkServiceStatus();
        if (!status.isRunning) {
            const instructions: StartupInstructions = serviceChecker.getStartupInstructions();
            console.error('❌ Audio service not running!');
            console.log('📋 To start the service:');
            instructions.commands.forEach(cmd => console.log(`   ${cmd}`));
            
            throw new Error(`Audio service not running: ${status.error}. Please start the service manually.`);
        }
        
        audioClient = new NodeJSAudioClient();
        
        // Setup event handlers
        audioClient.on('mixerStateChanged', (state: MixerState) => {
            tracks = state.tracks;
            console.log(`Audio state updated: ${tracks.length} tracks, ${(state.memoryUsage.rss / 1024 / 1024).toFixed(1)}MB memory`);
            
            // Debug: Log track names to identify duplicates
            if (tracks.length > 0) {
                console.log('🎵 Current tracks in mixer:');
                const tracksByName: Record<string, number[]> = {};
                tracks.forEach((track, index) => {
                    const trackName = track.name || 'Unknown';
                    if (!tracksByName[trackName]) {
                        tracksByName[trackName] = [];
                    }
                    tracksByName[trackName].push(index + 1);
                    console.log(`  ${index + 1}. ${trackName} (ID: ${track.id})`);
                });
                
                // Check for duplicates
                const duplicates = Object.entries(tracksByName).filter(([, indices]) => indices.length > 1);
                if (duplicates.length > 0) {
                    console.warn('⚠️ DUPLICATE TRACKS DETECTED:');
                    duplicates.forEach(([name, indices]) => {
                        console.warn(`  "${name}" appears ${indices.length} times at positions: ${indices.join(', ')}`);
                    });
                }
            }
        });
        
        audioClient.on('error', (error: Error) => {
            console.error('Audio service error:', error);
        });
        
        audioClient.on('connectionLost', () => {
            console.warn('Audio service connection lost');
            isInitialized = false;
        });
        
        audioClient.on('playbackComplete', (data: PlaybackCompleteData) => {
            console.log('🎵 Playback completed:', data);
            // Notify all registered handlers
            eventHandlers.playbackComplete.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in playback complete handler:', error);
                }
            });
        });
        
        audioClient.on('crossfadeComplete', (data: CrossfadeCompleteData) => {
            console.log('🎵 Crossfade completed:', data);
            // Notify all registered handlers
            eventHandlers.crossfadeComplete.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in crossfade complete handler:', error);
                }
            });
        });

        audioClient.on('tracksCleared', () => {
            tracks = [];
            console.log('🗑️  Tracks cleared');
        });

        audioClient.on('crossfadeProgress', (data: CrossfadeProgressData) => {
            console.log(`🔄 Crossfade progress: ${Math.round(data.progress * 100)}%`);
        });

        audioClient.on('crossfadeComplete', (data: CrossfadeCompleteData) => {
            console.log(`✅ Crossfade complete: ${data.newTracks.length} new tracks`);
            // Force refresh track list after crossfade
            refreshTrackList();
        });
        
        // Connect to the service
        await audioClient.connect();
        isInitialized = true;
        
        console.log('✅ Audio service initialized successfully');
        return audioClient;
        
    } catch (error) {
        console.error('❌ Failed to initialize audio service:', error);
        isInitialized = false;
        throw error;
    }
}

// Ensure audio service is initialized before operations
async function ensureAudioService(): Promise<NodeJSAudioClient> {
    if (!audioClient || !isInitialized) {
        await initializeAudioService();
    }
    return audioClient!;
}

// Get current tracks
export function getTracks(): Track[] {
    return tracks;
}

// Clear all tracks
export async function clearTracks(): Promise<void> {
    const client = await ensureAudioService();
    await client.clearAllTracks();
    tracks = [];
}

// Add tracks (load multiple audio files as a song)
export async function addTracks(trackPaths: string[], songName: string | null = null): Promise<TrackLoadResult[]> {
    const client = await ensureAudioService();
    
    console.log(`📁 Loading ${trackPaths.length} tracks...`);
    console.log(`📁 Call stack:`, new Error().stack);
    console.log(`📁 Track paths being loaded:`, trackPaths);
    
    // Determine song name from directory if not provided
    let finalSongName = songName;
    if (!finalSongName && trackPaths.length > 0) {
        // Extract directory name from first track path (browser-compatible)
        const firstPath = trackPaths[0];
        const lastSlashIndex = Math.max(firstPath.lastIndexOf('/'), firstPath.lastIndexOf('\\'));
        const dirPath = firstPath.substring(0, lastSlashIndex);
        const lastDirSlashIndex = Math.max(dirPath.lastIndexOf('/'), dirPath.lastIndexOf('\\'));
        finalSongName = dirPath.substring(lastDirSlashIndex + 1);
    }
    finalSongName = finalSongName || 'Unnamed Song';
    
    console.log(`🎵 Creating song: "${finalSongName}"`);
    
    try {
        const songResult: CreateSongResult = await client.createSong(finalSongName, trackPaths);
        console.log(`✅ Created song: ${finalSongName} (ID: ${songResult.songId})`);
        
        // Apply default panning (click/guide tracks to left)
        await client.applyDefaultPanning();
        
        // Get track information from mixer state for UI compatibility
        const mixerState: MixerState = await client.getMixerState();
        
        // Return track information in the expected format for backward compatibility
        const trackResults: TrackLoadResult[] = mixerState.tracks.map(track => ({
            path: track.filePath,
            trackId: track.id,
            name: track.name,
            success: true
        }));
        
        return trackResults;
    } catch (error) {
        console.error('❌ Failed to create song:', error);
        throw error;
    }
}

// Load a single audio file
export async function loadAudioFile(path: string, name: string | null = null): Promise<string> {
    const client = await ensureAudioService();
    
    try {
        const trackId: string = await client.loadTrack(path, name);
        console.log(`✅ Loaded track: ${name || path}`);
        return trackId;
    } catch (error) {
        console.error(`❌ Failed to load track ${path}:`, error);
        throw error;
    }
}

// Play all tracks
export async function playAllTracks(): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.playAllTracks();
        console.log('▶️  Playing all tracks');
    } catch (error) {
        console.error('❌ Failed to play all tracks:', error);
        throw error;
    }
}

// Stop all audio
export async function stopAllAudio(): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.stopAllTracks();
        console.log('⏹️  Stopped all tracks');
    } catch (error) {
        console.error('❌ Failed to stop all tracks:', error);
        throw error;
    }
}

// Go to beginning of all tracks (stop and restart)
export async function goToBeginningAllTracks(): Promise<void> {
    console.log('🔄 goToBeginningAllTracks called');
    const client = await ensureAudioService();
    
    try {
        await client.stopAllTracks();
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        await client.playAllTracks();
        console.log('⏮️  Restarted all tracks from beginning');
    } catch (error) {
        console.error('❌ Failed to restart tracks:', error);
        throw error;
    }
}

// Set global/master volume
export async function setGlobalVolume(volume: number): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.setMasterVolume(volume);
        console.log(`🔊 Set master volume to ${Math.round(volume * 100)}%`);
    } catch (error) {
        console.error('❌ Failed to set master volume:', error);
        throw error;
    }
}

// Set individual track volume
export async function setTrackVolume(trackId: string, volume: number): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.setTrackVolume(trackId, volume);
        console.log(`🎚️  Set track ${trackId} volume to ${Math.round(volume * 100)}%`);
    } catch (error) {
        console.error(`❌ Failed to set track volume:`, error);
        throw error;
    }
}

// Set track panning
export async function setPan(track: Track, panValue: number): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        console.log(`🎛️ [setPan] Setting track ${track.name} (ID: ${track.id}) pan to ${panValue}`);
        await client.setTrackPan(track.id, panValue);
        track.panValue = panValue; // Update local state
        console.log(`✅ [setPan] Successfully set track ${track.name} pan to ${panValue}`);
    } catch (error) {
        console.error(`❌ [setPan] Failed to set track pan:`, error);
        throw error;
    }
}

// Set track mute state
export async function setTrackMute(track: Track, muted: boolean): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        console.log(`🔇 [setTrackMute] Setting track ${track.name} (ID: ${track.id}) mute to ${muted}`);
        await client.setTrackMute(track.id, muted);
        track.isMuted = muted; // Update local state
        console.log(`✅ [setTrackMute] Successfully set track ${track.name} mute to ${muted}`);
    } catch (error) {
        console.error(`❌ [setTrackMute] Failed to set track mute:`, error);
        throw error;
    }
}

// Play individual track
export async function playTrack(trackId: string): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.playTrack(trackId);
        console.log(`▶️  Playing track ${trackId}`);
    } catch (error) {
        console.error(`❌ Failed to play track:`, error);
        throw error;
    }
}

// Stop individual track
export async function stopTrack(trackId: string): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.stopTrack(trackId);
        console.log(`⏹️  Stopped track ${trackId}`);
    } catch (error) {
        console.error(`❌ Failed to stop track:`, error);
        throw error;
    }
}

// Remove track
export async function removeTrack(trackId: string): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.removeTrack(trackId);
        console.log(`🗑️  Removed track ${trackId}`);
    } catch (error) {
        console.error(`❌ Failed to remove track:`, error);
        throw error;
    }
}

// Get memory usage
export async function getMemoryUsage(): Promise<MemoryUsageResult | null> {
    const client = await ensureAudioService();
    
    try {
        const usage: MemoryUsage = await client.getMemoryUsage();
        return {
            rss: usage.rss,
            heapUsed: usage.heapUsed,
            formatted: client.formatMemoryUsage(usage)
        };
    } catch (error) {
        console.error('❌ Failed to get memory usage:', error);
        return null;
    }
}

// Get audio service health
export async function getAudioServiceHealth(): Promise<HealthResponse | null> {
    const client = await ensureAudioService();
    
    try {
        return await client.checkHealth();
    } catch (error) {
        console.error('❌ Failed to check service health:', error);
        return null;
    }
}

// Cleanup function (called when component unmounts)
export function cleanupAudio(): void {
    if (audioClient) {
        audioClient.disconnect();
        audioClient = null;
    }
    tracks = [];
    isInitialized = false;
    console.log('🧹 Audio service cleaned up');
}

// Cleanup and stop audio service (called when app closes)
export async function cleanupAndStopAudio(): Promise<void> {
    console.log('🧹 Cleaning up and stopping audio service...');
    
    try {
        // First disconnect client
        cleanupAudio();
        
        // Then stop the service
        await stopAudioServiceFromApp();
        console.log('✅ Audio service cleanup complete');
    } catch (error) {
        console.error('❌ Error during audio service cleanup:', error);
    }
}

// Get service checker for UI feedback
export function getServiceChecker(): AudioServiceChecker {
    if (!serviceChecker) {
        serviceChecker = new AudioServiceChecker();
    }
    return serviceChecker;
}

// Legacy compatibility functions (these were in the old audio.js)
export function clearAudioBufferCache(): void {
    // No-op for Node.js service (streaming doesn't cache)
    console.log('📦 Audio buffer cache cleared (streaming mode)');
}

export function addTrack(track: Track): void {
    tracks.push(track);
}

// Backward compatibility for existing code
export { getTracks as getAudioContext };
export { initializeAudioService as initAudio };

// Export the client for direct access if needed
export function getAudioClient(): NodeJSAudioClient | null {
    return audioClient;
}

// Monitor memory usage periodically
let memoryMonitor: NodeJS.Timeout | null = null;

export function startMemoryMonitoring(intervalMs: number = 30000): void {
    if (memoryMonitor) {
        clearInterval(memoryMonitor);
    }
    
    memoryMonitor = setInterval(async () => {
        try {
            const usage = await getMemoryUsage();
            if (usage) {
                const memoryMB = usage.rss / 1024 / 1024;
                console.log(`💾 Audio service memory: ${memoryMB.toFixed(1)}MB`);
                
                // Warning if memory usage gets high
                if (memoryMB > 500) {
                    console.warn(`⚠️  High memory usage: ${memoryMB.toFixed(1)}MB`);
                }
            }
        } catch (error) {
            console.error('Failed to check memory usage:', error);
        }
    }, intervalMs);
}

export function stopMemoryMonitoring(): void {
    if (memoryMonitor) {
        clearInterval(memoryMonitor);
        memoryMonitor = null;
    }
}

// Crossfade functions
export async function crossfadeToTracks(trackPaths: string[], fadeDuration: number = 3000): Promise<CrossfadeResult> {
    const client = await ensureAudioService();
    
    try {
        console.log(`🎵 Starting crossfade to ${trackPaths.length} tracks (${fadeDuration}ms)`);
        console.log(`🎵 Crossfade call stack:`, new Error().stack);
        console.log(`🎵 Crossfade track paths:`, trackPaths);
        
        const result: CrossfadeResult = await client.crossfadeToTracks(trackPaths, fadeDuration);
        
        if (result.success) {
            console.log('✅ Crossfade initiated successfully');
        } else {
            console.warn('⚠️  Crossfade may have failed');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Failed to start crossfade:', error);
        throw error;
    }
}

export async function setCrossfadeDuration(duration: number): Promise<void> {
    const client = await ensureAudioService();
    
    try {
        await client.setCrossfadeDuration(duration);
        console.log(`🎛️  Crossfade duration set to ${duration}ms`);
    } catch (error) {
        console.error('❌ Failed to set crossfade duration:', error);
        throw error;
    }
}

export async function getCrossfadeStatus(): Promise<CrossfadeStatus | null> {
    const client = await ensureAudioService();
    
    try {
        return await client.getCrossfadeStatus();
    } catch (error) {
        console.error('❌ Failed to get crossfade status:', error);
        return null;
    }
}

export async function getMixerState(): Promise<MixerState | null> {
    const client = await ensureAudioService();
    
    try {
        const state: MixerState = await client.getMixerState();
        return state;
    } catch (error) {
        console.error('❌ Failed to get mixer state:', error);
        return null;
    }
}

// Force refresh track list from server
export async function refreshTrackList(): Promise<Track[]> {
    const client = await ensureAudioService();
    
    try {
        const state: MixerState = await client.getMixerState();
        tracks = state.tracks;
        console.log(`🔄 Track list refreshed: ${tracks.length} tracks`);
        return tracks;
    } catch (error) {
        console.error('❌ Failed to refresh track list:', error);
        return [];
    }
}

// Start audio service via backend command
export async function startAudioServiceFromApp(): Promise<unknown> {
    if (!audioClient) {
        audioClient = new NodeJSAudioClient();
    }
    
    try {
        const result = await audioClient.startAudioService();
        console.log('✅ Audio service started from app:', result);
        
        // Wait a moment for the service to fully start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to initialize connection
        await initializeAudioService();
        
        return result;
    } catch (error) {
        console.error('❌ Failed to start audio service from app:', error);
        throw error;
    }
}

// Check audio service status via backend command
export async function checkAudioServiceStatusFromApp(): Promise<boolean> {
    if (!audioClient) {
        audioClient = new NodeJSAudioClient();
    }
    
    try {
        return await audioClient.checkAudioServiceStatus();
    } catch (error) {
        console.error('❌ Failed to check audio service status:', error);
        return false;
    }
}

// Stop audio service via backend command
export async function stopAudioServiceFromApp(): Promise<unknown> {
    try {
        const { core } = await import('../../electron-adapter');
        const result = await core.invoke('stop_audio_service');
        console.log('✅ Audio service stopped:', result);
        
        // Reset client state
        if (audioClient) {
            audioClient.disconnect();
            audioClient = null;
        }
        isInitialized = false;
        tracks = [];
        
        return result;
    } catch (error) {
        console.error('❌ Failed to stop audio service from app:', error);
        throw error;
    }
}

// Clear all tracks to prevent duplicates
export async function clearAllTracks(): Promise<ClearTracksResult> {
    const client = await ensureAudioService();
    
    try {
        await audioApi.clearMixer();
        console.log('🧹 All tracks cleared successfully');
        tracks = [];
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to clear tracks:', error);
        throw error;
    }
}

// Event handler registration functions
export function onPlaybackComplete(handler: EventHandler<PlaybackCompleteData>): void {
    if (typeof handler === 'function') {
        eventHandlers.playbackComplete.push(handler);
    }
}

export function offPlaybackComplete(handler: EventHandler<PlaybackCompleteData>): void {
    const index = eventHandlers.playbackComplete.indexOf(handler);
    if (index > -1) {
        eventHandlers.playbackComplete.splice(index, 1);
    }
}

export function onCrossfadeComplete(handler: EventHandler<CrossfadeCompleteData>): void {
    if (typeof handler === 'function') {
        eventHandlers.crossfadeComplete.push(handler);
    }
}

export function offCrossfadeComplete(handler: EventHandler<CrossfadeCompleteData>): void {
    const index = eventHandlers.crossfadeComplete.indexOf(handler);
    if (index > -1) {
        eventHandlers.crossfadeComplete.splice(index, 1);
    }
}
