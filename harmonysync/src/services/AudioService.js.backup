/**
 * Audio Service - Business logic for audio operations
 * 
 * This service abstracts all audio-related functionality including:
 * - Loading and managing audio tracks
 * - Transposing audio files
 * - Playback controls
 * - Volume and pan controls
 * - Mixer configuration persistence
 */
class AudioService {
  constructor(ipcService) {
    this.ipc = ipcService;
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
    return await this.ipc.invoke('audio:cleanup');
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
