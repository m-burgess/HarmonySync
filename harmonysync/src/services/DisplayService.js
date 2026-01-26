/**
 * Display Service - Business logic for display operations
 * 
 * This service abstracts display-related functionality including:
 * - Showing slides on audience/confidence/lower thirds screens
 * - Clearing displays
 * - Black screen control
 * - Display configuration
 */
class DisplayService {
  constructor(ipcService) {
    this.ipc = ipcService;
  }

  /**
   * Show a slide on audience screen
   * @param {Object} slide - Slide object with text, background, etc.
   * @returns {Promise<void>}
   */
  async showSlideOnAudience(slide) {
    return await this.ipc.invoke('display:showSlideOnAudience', slide);
  }

  /**
   * Show a slide on confidence monitor
   * @param {Object} slide - Slide object
   * @returns {Promise<void>}
   */
  async showSlideOnConfidence(slide) {
    return await this.ipc.invoke('display:showSlideOnConfidence', slide);
  }

  /**
   * Show text on lower thirds
   * @param {string} line1 - First line of text
   * @param {string} line2 - Second line of text
   * @returns {Promise<void>}
   */
  async showLowerThirds(line1, line2) {
    return await this.ipc.invoke('display:showLowerThirds', line1, line2);
  }

  /**
   * Clear audience screen
   * @returns {Promise<void>}
   */
  async clearAudience() {
    return await this.ipc.invoke('display:clearAudience');
  }

  /**
   * Clear confidence monitor
   * @returns {Promise<void>}
   */
  async clearConfidence() {
    return await this.ipc.invoke('display:clearConfidence');
  }

  /**
   * Clear lower thirds
   * @returns {Promise<void>}
   */
  async clearLowerThirds() {
    return await this.ipc.invoke('display:clearLowerThirds');
  }

  /**
   * Enable black screen on audience display
   * @param {boolean} enabled - Whether to enable black screen
   * @returns {Promise<void>}
   */
  async setBlackScreen(enabled) {
    return await this.ipc.invoke('display:setBlackScreen', enabled);
  }

  /**
   * Get display configuration
   * @returns {Promise<Object>} Display configuration
   */
  async getDisplayConfig() {
    return await this.ipc.invoke('display:getConfig');
  }

  /**
   * Save display configuration
   * @param {Object} config - Display configuration
   * @returns {Promise<void>}
   */
  async saveDisplayConfig(config) {
    return await this.ipc.invoke('display:saveConfig', config);
  }

  /**
   * Open display windows (audience, confidence, lower thirds)
   * @returns {Promise<void>}
   */
  async openDisplayWindows() {
    return await this.ipc.invoke('display:openWindows');
  }

  /**
   * Close display windows
   * @returns {Promise<void>}
   */
  async closeDisplayWindows() {
    return await this.ipc.invoke('display:closeWindows');
  }

  /**
   * Move display window to specific screen
   * @param {string} windowType - 'audience', 'confidence', or 'lowerThirds'
   * @param {number} screenIndex - Screen index
   * @returns {Promise<void>}
   */
  async moveWindowToScreen(windowType, screenIndex) {
    return await this.ipc.invoke('display:moveWindowToScreen', windowType, screenIndex);
  }

  /**
   * Get available screens
   * @returns {Promise<Array>} Array of screen objects
   */
  async getScreens() {
    return await this.ipc.invoke('display:getScreens');
  }
}

export default DisplayService;
