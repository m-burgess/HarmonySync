/**
 * File Service - Business logic for file system operations
 * 
 * This service abstracts file system operations including:
 * - Folder and file selection dialogs
 * - Reading and writing files
 * - File existence checks
 * - Path operations
 */
class FileService {
  constructor(ipcService) {
    this.ipc = ipcService;
  }

  /**
   * Open folder selection dialog
   * @returns {Promise<string|null>} Selected folder path or null if cancelled
   */
  async selectFolder() {
    return await this.ipc.invoke('dialog:openDirectory');
  }

  /**
   * Open file selection dialog
   * @param {Object} options - Dialog options (filters, multiple, etc.)
   * @returns {Promise<string|string[]|null>} Selected file path(s) or null
   */
  async selectFile(options = {}) {
    return await this.ipc.invoke('dialog:openFile', options);
  }

  /**
   * Read file contents
   * @param {string} path - File path
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<string>} File contents
   */
  async readFile(path, encoding = 'utf8') {
    return await this.ipc.invoke('fs:readFile', path, encoding);
  }

  /**
   * Write file contents
   * @param {string} path - File path
   * @param {string} contents - File contents
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<void>}
   */
  async writeFile(path, contents, encoding = 'utf8') {
    return await this.ipc.invoke('fs:writeFile', path, contents, encoding);
  }

  /**
   * Check if file or folder exists
   * @param {string} path - File or folder path
   * @returns {Promise<boolean>}
   */
  async exists(path) {
    return await this.ipc.invoke('fs:exists', path);
  }

  /**
   * Read directory contents
   * @param {string} path - Directory path
   * @returns {Promise<Array<string>>} Array of file/folder names
   */
  async readDirectory(path) {
    return await this.ipc.invoke('fs:readDir', path);
  }

  /**
   * Get file stats
   * @param {string} path - File path
   * @returns {Promise<Object>} File stats (size, mtime, etc.)
   */
  async getStats(path) {
    return await this.ipc.invoke('fs:stat', path);
  }

  /**
   * Create directory
   * @param {string} path - Directory path
   * @returns {Promise<void>}
   */
  async createDirectory(path) {
    return await this.ipc.invoke('fs:mkdir', path);
  }

  /**
   * Delete file or folder
   * @param {string} path - File or folder path
   * @returns {Promise<void>}
   */
  async delete(path) {
    return await this.ipc.invoke('fs:delete', path);
  }

  /**
   * Copy file or folder
   * @param {string} source - Source path
   * @param {string} destination - Destination path
   * @returns {Promise<void>}
   */
  async copy(source, destination) {
    return await this.ipc.invoke('fs:copy', source, destination);
  }

  /**
   * Move/rename file or folder
   * @param {string} source - Source path
   * @param {string} destination - Destination path
   * @returns {Promise<void>}
   */
  async move(source, destination) {
    return await this.ipc.invoke('fs:move', source, destination);
  }

  /**
   * Get path join
   * @param {...string} parts - Path parts to join
   * @returns {Promise<string>} Joined path
   */
  async joinPath(...parts) {
    return await this.ipc.invoke('path:join', ...parts);
  }

  /**
   * Get path basename
   * @param {string} path - File path
   * @returns {Promise<string>} Basename
   */
  async basename(path) {
    return await this.ipc.invoke('path:basename', path);
  }

  /**
   * Get path dirname
   * @param {string} path - File path
   * @returns {Promise<string>} Directory name
   */
  async dirname(path) {
    return await this.ipc.invoke('path:dirname', path);
  }
}

export default FileService;
