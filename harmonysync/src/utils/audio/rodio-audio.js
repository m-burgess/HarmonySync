/**
 * Memory-efficient audio system using Rust rodio streaming
 * Replaces the FFmpeg-based system to reduce memory usage from 12GB+ to <100MB
 */

import { core } from '../../electron-adapter';

// Track management state
let audioTracks = new Map();
let isInitialized = false;

/**
 * Initialize the rodio audio system
 */
export async function initRodioAudio() {
    if (isInitialized) return;
    
    try {
        await core.invoke('init_rodio_audio');
        isInitialized = true;
        console.log('[Rodio Audio] Initialized successfully');
    } catch (error) {
        console.error('[Rodio Audio] Failed to initialize:', error);
        throw error;
    }
}

/**
 * Load an audio file as a streaming track
 * @param {string} path - File path to load
 * @param {string} name - Optional track name
 * @returns {Promise<string>} Track ID
 */
export async function loadAudioTrack(path, name = null) {
    if (!isInitialized) {
        await initRodioAudio();
    }
    
    try {
        const trackId = await core.invoke('load_audio_track', { path, name });
        console.log(`[Rodio Audio] Loaded track: ${name || path} (ID: ${trackId})`);
        return trackId;
    } catch (error) {
        console.error('[Rodio Audio] Failed to load track:', error);
        throw error;
    }
}

/**
 * Play a specific track
 * @param {string} trackId - Track ID to play
 */
export async function playTrack(trackId) {
    try {
        await core.invoke('play_audio_track', { trackId });
        console.log(`[Rodio Audio] Playing track: ${trackId}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to play track:', error);
        throw error;
    }
}

/**
 * Stop a specific track
 * @param {string} trackId - Track ID to stop
 */
export async function stopTrack(trackId) {
    try {
        await core.invoke('stop_audio_track', { trackId });
        console.log(`[Rodio Audio] Stopped track: ${trackId}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to stop track:', error);
        throw error;
    }
}

/**
 * Stop all tracks
 */
export async function stopAllTracks() {
    try {
        await core.invoke('stop_all_audio_tracks');
        console.log('[Rodio Audio] Stopped all tracks');
    } catch (error) {
        console.error('[Rodio Audio] Failed to stop all tracks:', error);
        throw error;
    }
}

/**
 * Set track volume
 * @param {string} trackId - Track ID
 * @param {number} volume - Volume (0.0 to 2.0)
 */
export async function setTrackVolume(trackId, volume) {
    try {
        await core.invoke('set_track_volume', { trackId, volume });
        console.log(`[Rodio Audio] Set volume for ${trackId}: ${volume}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to set track volume:', error);
        throw error;
    }
}

/**
 * Set track pan
 * @param {string} trackId - Track ID
 * @param {number} pan - Pan (-1.0 to 1.0, -1=left, 0=center, 1=right)
 */
export async function setTrackPan(trackId, pan) {
    try {
        await core.invoke('set_track_pan', { trackId, pan });
        console.log(`[Rodio Audio] Set pan for ${trackId}: ${pan}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to set track pan:', error);
        throw error;
    }
}

/**
 * Mute/unmute track
 * @param {string} trackId - Track ID
 * @param {boolean} muted - Mute state
 */
export async function setTrackMute(trackId, muted) {
    try {
        await core.invoke('set_track_mute', { trackId, muted });
        console.log(`[Rodio Audio] ${muted ? 'Muted' : 'Unmuted'} track: ${trackId}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to set track mute:', error);
        throw error;
    }
}

/**
 * Set master volume
 * @param {number} volume - Master volume (0.0 to 2.0)
 */
export async function setMasterVolume(volume) {
    try {
        await core.invoke('set_master_volume', { volume });
        console.log(`[Rodio Audio] Set master volume: ${volume}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to set master volume:', error);
        throw error;
    }
}

/**
 * Get current mixer state
 * @returns {Promise<Object>} Mixer state with all tracks
 */
export async function getMixerState() {
    try {
        const state = await core.invoke('get_mixer_state');
        console.log('[Rodio Audio] Got mixer state:', state);
        return state;
    } catch (error) {
        console.error('[Rodio Audio] Failed to get mixer state:', error);
        throw error;
    }
}

/**
 * Remove a track
 * @param {string} trackId - Track ID to remove
 */
export async function removeTrack(trackId) {
    try {
        await core.invoke('remove_audio_track', { trackId });
        console.log(`[Rodio Audio] Removed track: ${trackId}`);
    } catch (error) {
        console.error('[Rodio Audio] Failed to remove track:', error);
        throw error;
    }
}

/**
 * Clear all tracks
 */
export async function clearAllTracks() {
    try {
        await core.invoke('clear_all_audio_tracks');
        console.log('[Rodio Audio] Cleared all tracks');
    } catch (error) {
        console.error('[Rodio Audio] Failed to clear all tracks:', error);
        throw error;
    }
}

/**
 * Get memory usage estimate (should be much lower than FFmpeg approach)
 * @returns {Promise<number>} Memory usage in bytes
 */
export async function getMemoryUsage() {
    try {
        const usage = await core.invoke('get_audio_memory_usage');
        console.log(`[Rodio Audio] Memory usage: ${(usage / 1024 / 1024).toFixed(2)} MB`);
        return usage;
    } catch (error) {
        console.error('[Rodio Audio] Failed to get memory usage:', error);
        throw error;
    }
}

/**
 * Load multiple tracks from an array of file paths
 * @param {Array<{path: string, name?: string}>} trackPaths - Array of track info
 * @returns {Promise<Array<string>>} Array of track IDs
 */
export async function loadMultipleTracks(trackPaths) {
    const trackIds = [];
    
    for (const trackInfo of trackPaths) {
        try {
            const trackId = await loadAudioTrack(trackInfo.path, trackInfo.name);
            trackIds.push(trackId);
        } catch (error) {
            console.error(`[Rodio Audio] Failed to load track ${trackInfo.path}:`, error);
        }
    }
    
    return trackIds;
}

/**
 * Apply default panning based on track names
 * @param {Array<string>} trackIds - Track IDs to apply panning to
 */
export async function applyDefaultPanning(trackIds) {
    try {
        const state = await getMixerState();
        const hasClickOrGuide = state.tracks.some(track => 
            track.name.toLowerCase().includes('click') || 
            track.name.toLowerCase().includes('guide')
        );
        
        for (const track of state.tracks) {
            if (trackIds.includes(track.id)) {
                const lowerCaseName = track.name.toLowerCase();
                let panValue = 0; // Default center
                
                if (hasClickOrGuide) {
                    if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
                        panValue = -1; // Hard left
                    } else {
                        panValue = 1; // Hard right
                    }
                }
                
                await setTrackPan(track.id, panValue);
            }
        }
        
        console.log('[Rodio Audio] Applied default panning');
    } catch (error) {
        console.error('[Rodio Audio] Failed to apply default panning:', error);
    }
}

// Export all functions
export default {
    initRodioAudio,
    loadAudioTrack,
    playTrack,
    stopTrack,
    stopAllTracks,
    setTrackVolume,
    setTrackPan,
    setTrackMute,
    setMasterVolume,
    getMixerState,
    removeTrack,
    clearAllTracks,
    getMemoryUsage,
    loadMultipleTracks,
    applyDefaultPanning,
};