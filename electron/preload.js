const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] ============================================');
console.log('[Preload] Preload script executing...');
console.log('[Preload] contextBridge available:', typeof contextBridge);
console.log('[Preload] ipcRenderer available:', typeof ipcRenderer);
console.log('[Preload] ============================================');

// Build the API object once so we can expose it under multiple names
const api = {
  // File operations
  openDirectory: (options) => {
    console.log('[Preload] openDirectory invoked with options:', options);
    return ipcRenderer.invoke('dialog:openDirectory', options);
  },
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
  readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  
  // Database operations
  dbQuery: (query, params) => ipcRenderer.invoke('db:query', query, params),
  dbRun: (query, params) => ipcRenderer.invoke('db:run', query, params),
  dbGet: (query, params) => ipcRenderer.invoke('db:get', query, params),
  dbAll: (query, params) => ipcRenderer.invoke('db:all', query, params),
  
  // FFmpeg operations
  convertToOgg: (inputPath, outputDir) => ipcRenderer.invoke('ffmpeg:convertToOgg', inputPath, outputDir),
  transposeAudio: (songPath, semitones) => ipcRenderer.invoke('ffmpeg:transposeAudio', songPath, semitones),
  getVideoMetadata: (path) => ipcRenderer.invoke('ffmpeg:getVideoMetadata', path),
  transcodeVideo: (inputPath) => ipcRenderer.invoke('ffmpeg:transcodeVideo', inputPath),
  generateThumbnail: (videoPath) => ipcRenderer.invoke('ffmpeg:generateThumbnail', videoPath),
  
  // Window operations
  showAudienceWindow: () => ipcRenderer.invoke('window:showAudience'),
  hideAudienceWindow: () => ipcRenderer.invoke('window:hideAudience'),
  showConfidenceWindow: () => ipcRenderer.invoke('window:showConfidence'),
  hideConfidenceWindow: () => ipcRenderer.invoke('window:hideConfidence'),
  showLowerThirdsWindow: () => ipcRenderer.invoke('window:showLowerThirds'),
  hideLowerThirdsWindow: () => ipcRenderer.invoke('window:hideLowerThirds'),
  openPreserviceMusicWindow: () => ipcRenderer.invoke('open_preservice_music_window'),
  closePreserviceMusicWindow: () => ipcRenderer.invoke('close_preservice_music_window'),
  openSchedulerWindow: () => ipcRenderer.invoke('open_scheduler_window'),
  
  // Display video/slides
  displayVideoSlide: (path, duration) => ipcRenderer.invoke('display:videoSlide', path, duration),
  displaySlide: (content) => ipcRenderer.invoke('display:slide', content),
  displayBlackScreen: () => ipcRenderer.invoke('display:blackScreen'),
  
  // MIDI operations
  getMidiDevices: () => ipcRenderer.invoke('midi:getDevices'),
  sendMidiNote: (device, note, velocity, duration) => ipcRenderer.invoke('midi:sendNote', device, note, velocity, duration),
  
  // Lyrics fetcher
  searchLyrics: (title, artist) => ipcRenderer.invoke('lyrics:search', title, artist),
  fetchLyrics: (songId) => ipcRenderer.invoke('lyrics:fetch', songId),
  
  // Slides service
  importPdfSlides: (pdfPath, options) => ipcRenderer.invoke('slides:importPdf', pdfPath, options),
  importPowerpointSlides: (pptxPath, options) => ipcRenderer.invoke('slides:importPowerpoint', pptxPath, options),
  createTextSlide: (text, style, backgroundImage) => ipcRenderer.invoke('slides:createTextSlide', text, style, backgroundImage),
  importSlidesFromFolder: (folderPath, options) => ipcRenderer.invoke('slides:importFromFolder', folderPath, options),
  importSlidesFromZip: (zipPath, options) => ipcRenderer.invoke('slides:importFromZip', zipPath, options),
  scanServiceFolder: (servicePath) => ipcRenderer.invoke('slides:scanServiceFolder', servicePath),
  validateSlideFile: (filePath) => ipcRenderer.invoke('slides:validateFile', filePath),
  getSlideMetadata: (filePath) => ipcRenderer.invoke('slides:getMetadata', filePath),
  
  // Google Drive integration
  googleDriveAuth: () => ipcRenderer.invoke('gdrive:auth'),
  googleDriveListFiles: (folderId) => ipcRenderer.invoke('gdrive:listFiles', folderId),
  googleDriveDownloadFile: (fileId, destination) => ipcRenderer.invoke('gdrive:downloadFile', fileId, destination),
  googleDriveSyncFolder: (folderId, localPath) => ipcRenderer.invoke('gdrive:syncFolder', folderId, localPath),
  
  // HTTP Server
  getHttpServerUrl: () => ipcRenderer.invoke('http:getServerUrl'),
  
  // Background CSS generation
  generateBackgroundCss: (path) => ipcRenderer.invoke('css:generateBackground', path),
  
  // Settings
  getDisplays: () => ipcRenderer.invoke('settings:getDisplays'),
  getAudioDevices: () => ipcRenderer.invoke('settings:getAudioDevices'),
  getSettingsPath: () => ipcRenderer.invoke('settings:getSettingsPath'),
  
  // Display Configuration
  displayConfigGetAll: () => ipcRenderer.invoke('displayConfig:getAll'),
  displayConfigGet: (id) => ipcRenderer.invoke('displayConfig:get', id),
  displayConfigCreate: (config) => ipcRenderer.invoke('displayConfig:create', config),
  displayConfigUpdate: (id, updates) => ipcRenderer.invoke('displayConfig:update', id, updates),
  displayConfigDelete: (id) => ipcRenderer.invoke('displayConfig:delete', id),
  displayConfigReorder: (orderedIds) => ipcRenderer.invoke('displayConfig:reorder', orderedIds),
  displayConfigGetEnabled: () => ipcRenderer.invoke('displayConfig:getEnabled'),
  
  // Event listeners
  onDisplaySettingsClicked: (callback) => {
    ipcRenderer.on('display-settings-clicked', callback);
    return () => ipcRenderer.removeListener('display-settings-clicked', callback);
  },
  
  onAudioSettingsClicked: (callback) => {
    ipcRenderer.on('audio-settings-clicked', callback);
    return () => ipcRenderer.removeListener('audio-settings-clicked', callback);
  },
  
  onOggConversionProgress: (callback) => {
    ipcRenderer.on('ogg-conversion-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('ogg-conversion-progress');
  },
  
  onVideoTranscodeProgress: (callback) => {
    ipcRenderer.on('video-transcode-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('video-transcode-progress');
  },
  
  onTracksUpdated: (callback) => {
    ipcRenderer.on('tracks-updated', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('tracks-updated');
  },
  
  onVideoEnded: (callback) => {
    ipcRenderer.on('video-ended', callback);
    return () => ipcRenderer.removeAllListeners('video-ended');
  },
  
  onSlidesImportProgress: (callback) => {
    ipcRenderer.on('slides-import-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('slides-import-progress');
  },
  
  // Send to specific window
  sendToAudience: (channel, data) => ipcRenderer.invoke('send:audience', channel, data),
  sendToConfidence: (channel, data) => ipcRenderer.invoke('send:confidence', channel, data),
  sendToLowerThirds: (channel, data) => ipcRenderer.invoke('send:lowerThirds', channel, data),
  
  // Receive from main process
  receive: (channel, callback) => {
    // Accept all channels - remove whitelist restriction
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
    return () => ipcRenderer.removeAllListeners(channel);
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('[Preload] electronAPI successfully exposed');
  
  // Also expose a cached reference so renderer HMR reloads can find it immediately
  contextBridge.exposeInMainWorld('__electronAPICached', api);
  console.log('[Preload] __electronAPICached successfully exposed');
  
  // Platform information
  contextBridge.exposeInMainWorld('platform', {
    os: process.platform,
    arch: process.arch,
    version: process.version
  });
  console.log('[Preload] platform information successfully exposed');
  
  // Signal that preload is complete
  contextBridge.exposeInMainWorld('__preloadReady', true);
  console.log('[Preload] __preloadReady flag set');
  console.log('[Preload] ============================================');
  console.log('[Preload] Preload script completed successfully!');
  console.log('[Preload] All APIs exposed and ready');
  console.log('[Preload] ============================================');
} catch (error) {
  console.error('[Preload] ============================================');
  console.error('[Preload] CRITICAL ERROR exposing APIs:', error);
  console.error('[Preload] Stack:', error.stack);
  console.error('[Preload] ============================================');
}

// Verify exposure worked by checking if we can access it
// Note: We can't directly check window.electronAPI from here due to context isolation
console.log('[Preload] Script execution complete');
