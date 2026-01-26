/**
 * Slide Service - Business logic for slide operations
 * 
 * This service abstracts slide-related functionality including:
 * - Importing slides from various sources
 * - Managing slide collections
 * - Slide metadata operations
 */
class SlideService {
  constructor(ipcService) {
    this.ipc = ipcService;
  }

  /**
   * Import slides from a folder
   * @param {string} folderPath - Path to folder containing slide images
   * @returns {Promise<Array>} Array of imported slide objects
   */
  async importFromFolder(folderPath) {
    return await this.ipc.invoke('slides:importFromFolder', folderPath);
  }

  /**
   * Import slides from PDF
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Array>} Array of imported slide objects
   */
  async importFromPDF(pdfPath) {
    return await this.ipc.invoke('slides:importFromPDF', pdfPath);
  }

  /**
   * Import slides from PowerPoint
   * @param {string} pptxPath - Path to PPTX file
   * @returns {Promise<Array>} Array of imported slide objects
   */
  async importFromPowerPoint(pptxPath) {
    return await this.ipc.invoke('slides:importFromPowerPoint', pptxPath);
  }

  /**
   * Import slides from ZIP archive
   * @param {string} zipPath - Path to ZIP file
   * @returns {Promise<Array>} Array of imported slide objects
   */
  async importFromZip(zipPath) {
    return await this.ipc.invoke('slides:importFromZip', zipPath);
  }

  /**
   * Save slide collection
   * @param {string} name - Collection name
   * @param {Array} slides - Array of slide objects
   * @returns {Promise<void>}
   */
  async saveCollection(name, slides) {
    return await this.ipc.invoke('slides:saveCollection', name, slides);
  }

  /**
   * Load slide collection
   * @param {string} name - Collection name
   * @returns {Promise<Array>} Array of slide objects
   */
  async loadCollection(name) {
    return await this.ipc.invoke('slides:loadCollection', name);
  }

  /**
   * List all slide collections
   * @returns {Promise<Array<string>>} Array of collection names
   */
  async listCollections() {
    return await this.ipc.invoke('slides:listCollections');
  }

  /**
   * Delete slide collection
   * @param {string} name - Collection name
   * @returns {Promise<void>}
   */
  async deleteCollection(name) {
    return await this.ipc.invoke('slides:deleteCollection', name);
  }

  /**
   * Get slide metadata
   * @param {string} slidePath - Path to slide image
   * @returns {Promise<Object>} Slide metadata
   */
  async getMetadata(slidePath) {
    return await this.ipc.invoke('slides:getMetadata', slidePath);
  }

  /**
   * Update slide metadata
   * @param {string} slidePath - Path to slide image
   * @param {Object} metadata - Metadata object
   * @returns {Promise<void>}
   */
  async updateMetadata(slidePath, metadata) {
    return await this.ipc.invoke('slides:updateMetadata', slidePath, metadata);
  }
}

export default SlideService;
