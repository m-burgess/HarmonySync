/**
 * IPC Service - Abstraction layer for Electron IPC communication
 * 
 * This service wraps the Electron IPC API to:
 * 1. Make frontend code testable (can mock this service)
 * 2. Provide type-safe API for IPC calls
 * 3. Handle errors consistently
 * 4. Support both invoke (request/response) and send (fire-and-forget) patterns
 */
class IpcService {
  constructor(electronAPI = window.electronAPI) {
    if (!electronAPI) {
      throw new Error('Electron API not available. IpcService requires window.electronAPI.');
    }
    this.electronAPI = electronAPI;
  }

  /**
   * Invoke an IPC handler and wait for response
   * @param {string} channel - IPC channel name
   * @param {...any} args - Arguments to pass to handler
   * @returns {Promise<any>} Response from handler
   */
  async invoke(channel, ...args) {
    try {
      return await this.electronAPI.invoke(channel, ...args);
    } catch (error) {
      console.error(`IPC invoke failed on channel '${channel}':`, error);
      throw new Error(`IPC Error (${channel}): ${error.message}`);
    }
  }

  /**
   * Send a message without waiting for response
   * @param {string} channel - IPC channel name
   * @param {...any} args - Arguments to pass to handler
   */
  send(channel, ...args) {
    try {
      this.electronAPI.send(channel, ...args);
    } catch (error) {
      console.error(`IPC send failed on channel '${channel}':`, error);
      throw new Error(`IPC Error (${channel}): ${error.message}`);
    }
  }

  /**
   * Register a listener for messages from main process
   * @param {string} channel - IPC channel name
   * @param {Function} callback - Callback to handle messages
   * @returns {Function} Cleanup function to remove listener
   */
  on(channel, callback) {
    if (!this.electronAPI.on) {
      console.warn('Electron API does not support .on() for this channel:', channel);
      return () => {};
    }
    this.electronAPI.on(channel, callback);
    return () => this.electronAPI.removeListener?.(channel, callback);
  }

  /**
   * Register a one-time listener for messages from main process
   * @param {string} channel - IPC channel name
   * @param {Function} callback - Callback to handle message
   */
  once(channel, callback) {
    if (!this.electronAPI.once) {
      console.warn('Electron API does not support .once() for this channel:', channel);
      return;
    }
    this.electronAPI.once(channel, callback);
  }
}

export default IpcService;
