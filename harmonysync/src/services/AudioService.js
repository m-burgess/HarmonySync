/**
 * Audio Service - Business logic for audio operations
 * 
 * This service abstracts all audio-related functionality including:
 * - Loading and managing audio tracks
 * - Transposing audio files
 * - Playback controls
 * - Volume and pan controls
 * - Mixer configuration persistence
 * - Memory monitoring
 * - Audio service management
 */

// Import audio utilities for delegation
import * as audioUtils from '../utils/audio/audio-nodejs.js';

class AudioService {
  constructor(ipcService) {
    this.ipc = ipcService;
    this.memoryMonitorInterval = null;
    this.isInitialized = false;
  }

  /**
   * Load audio tracks from a folder
   * @param {string} folderPath - Path to folder containing audio files
   * @returns {Promise<Array>} Array of track objects
   */
  async loadTracks(folderPath) {
    return await this.ipc.invoke('audio:loadTracks', folderPath);
  }

  /**
   * Transpose audio files by semitones
   * @param {string} sourcePath - Source folder path
   * @param {number} semitones - Number of semitones to transpose (+/-)
   * @returns {Promise<{success: boolean, outputPath: string}>}
   */
  async transpose(sourcePath, semitones) {
    return await this.ipc.invoke('audio:transpose', sourcePath, semitones);
  }

  /**
   * Start playback
   * @returns {Promise<void>}
   */
  async play() {
    return await this.ipc.invoke('audio:play');
  }

  /**
   * Stop playback
   * @returns {Promise<void>}
   */
  async stop() {
    return await this.ipc.invoke('audio:stop');
  }

  /**
   * Pause playback
   * @returns {Promise<void>}
   */
  async pause() {
    return await this.ipc.invoke('audio:pause');
  }

  /**
   * Seek to position in seconds
   * @param {number} position - Position in seconds
   * @returns {Promise<void>}
   */
  async seek(position) {
    return await this.ipc.invoke('audio:seek', position);
  }

  /**
   * Set track volume
   * @param {number} trackIndex - Track index
   * @param {number} volume - Volume (0-1)
   * @returns {Promise<void>}
   */
  async setTrackVolume(trackIndex, volume) {
    return await this.ipc.invoke('audio:setTrackVolume', trackIndex, volume);
  }

  /**
   * Set track pan
   * @param {number} trackIndex - Track index
   * @param {number} pan - Pan value (-1 = left, 0 = center, 1 = right)
   * @returns {Promise<void>}
   */
  async setTrackPan(trackIndex, pan) {
    return await this.ipc.invoke('audio:setTrackPan', trackIndex, pan);
  }

  /**
   * Mute/unmute a track
   * @param {number} trackIndex - Track index
   * @param {boolean} muted - Whether to mute
   * @returns {Promise<void>}
   */
  async setTrackMute(trackIndex, muted) {
    return await this.ipc.invoke('audio:setTrackMute', trackIndex, muted);
  }

  /**
   * Save mixer configuration
   * @param {string} songPath - Path to song folder
   * @param {Object} config - Mixer configuration
   * @returns {Promise<void>}
   */
  async saveMixerConfig(songPath, config) {
    return await this.ipc.invoke('audio:saveMixerConfig', songPath, config);
  }

  /**
   * Load mixer configuration
   * @param {string} songPath - Path to song folder
   * @returns {Promise<Object|null>} Mixer configuration or null
   */
  async loadMixerConfig(songPath) {
    return await this.ipc.invoke('audio:loadMixerConfig', songPath);
  }

  /**
   * Get current playback position
   * @returns {Promise<number>} Current position in seconds
   */
  async getCurrentPosition() {
    return await this.ipc.invoke('audio:getCurrentPosition');
  }

  /**
   * Get track duration
   * @returns {Promise<number>} Duration in seconds
   */
  async getDuration() {
    return await this.ipc.invoke('audio:getDuration');
  }

  /**
   * Initialize audio service
   * @returns {Promise<void>}
   */
  async initialize() {
    return await this.ipc.invoke('audio:initialize');
  }

  /**
   * Clean up audio resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.stopMemoryMonitoring();
    return await audioUtils.cleanupAndStopAudio();
  }

  /**
   * Initialize audio service (connects to Node.js audio service)
   * @returns {Promise<void>}
   */
  async initializeAudioService() {
    if (this.isInitialized) {
      return;
    }
    await audioUtils.initializeAudioService();
    this.isInitialized = true;
  }

  /**
   * Get all tracks
   * @returns {Array} Current tracks
   */
  getTracks() {
    return audioUtils.getTracks();
  }

  /**
   * Clear all tracks
   * @returns {Promise<void>}
   */
  async clearTracks() {
    return await audioUtils.clearTracks();
  }

  /**
   * Add tracks (load multiple audio files as a song)
   * @param {Array<string>} trackPaths - Array of track file paths
   * @param {string} songName - Optional song name
   * @returns {Promise<Array>} Array of loaded track results
   */
  async addTracks(trackPaths, songName = null) {
    return await audioUtils.addTracks(trackPaths, songName);
  }

  /**
   * Play all tracks
   * @returns {Promise<void>}
   */
  async playAllTracks() {
    return await audioUtils.playAllTracks();
  }

  /**
   * Stop all audio
   * @returns {Promise<void>}
   */
  async stopAllAudio() {
    return await audioUtils.stopAllAudio();
  }

  /**
   * Go to beginning of all tracks (stop and restart)
   * @returns {Promise<void>}
   */
  async goToBeginningAllTracks() {
    return await audioUtils.goToBeginningAllTracks();
  }

  /**
   * Set global/master volume
   * @param {number} volume - Volume (0-1)
   * @returns {Promise<void>}
   */
  async setGlobalVolume(volume) {
    return await audioUtils.setGlobalVolume(volume);
  }

  /**
   * Set track mute state
   * @param {Object} track - Track object with id
   * @param {boolean} muted - Mute state
   * @returns {Promise<void>}
   */
  async setTrackMuteState(track, muted) {
    return await audioUtils.setTrackMute(track, muted);
  }

  /**
   * Set track pan
   * @param {Object} track - Track object with id
   * @param {number} panValue - Pan value (-1 to 1)
   * @returns {Promise<void>}
   */
  async setTrackPanValue(track, panValue) {
    return await audioUtils.setPan(track, panValue);
  }

  /**
   * Start audio service from app
   * @returns {Promise<Object>} Result object
   */
  async startAudioServiceFromApp() {
    const result = await audioUtils.startAudioServiceFromApp();
    this.isInitialized = true;
    return result;
  }

  /**
   * Check audio service status
   * @returns {Promise<boolean>} Service status
   */
  async checkAudioServiceStatus() {
    return await audioUtils.checkAudioServiceStatusFromApp();
  }

  /**
   * Get audio service health
   * @returns {Promise<Object>} Health information
   */
  async getAudioServiceHealth() {
    return await audioUtils.getAudioServiceHealth();
  }

  /**
   * Get service checker for UI feedback
   * @returns {Object} Service checker instance
   */
  getServiceChecker() {
    return audioUtils.getServiceChecker();
  }

  /**
   * Start memory monitoring
   * @param {number} intervalMs - Monitoring interval in milliseconds
   * @param {Function} callback - Callback to receive memory updates
   */
  startMemoryMonitoring(intervalMs, callback) {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.memoryMonitorInterval = setInterval(async () => {
      try {
        const usage = await this.getMemoryUsage();
        if (usage && callback) {
          callback(usage);
        }
      } catch (error) {
        console.error('Failed to check memory usage:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  }

  /**
   * Cleanup and stop audio service
   * @returns {Promise<void>}
   */
  async cleanupAndStopAudio() {
    this.stopMemoryMonitoring();
    this.isInitialized = false;
    return await audioUtils.cleanupAndStopAudio();
  }

  /**
   * Get memory usage statistics
   * @returns {Promise<Object>} Memory statistics
   */
  async getMemoryUsage() {
    return await this.ipc.invoke('audio:getMemoryUsage');
  }

  /**
   * Listen for playback position updates
   * @param {Function} callback - Callback receiving position
   * @returns {Function} Cleanup function
   */
  onPositionUpdate(callback) {
    return this.ipc.on('audio:positionUpdate', callback);
  }

  /**
   * Listen for playback state changes
   * @param {Function} callback - Callback receiving state
   * @returns {Function} Cleanup function
   */
  onStateChange(callback) {
    return this.ipc.on('audio:stateChange', callback);
  }
}

export default AudioService;
