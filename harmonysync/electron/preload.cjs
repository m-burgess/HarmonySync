const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File Management
  generateBackgroundCSS: (folderPath) => ipcRenderer.invoke('generate-background-css', folderPath),
  openLyricsFile: (filePath) => ipcRenderer.invoke('open-lyrics-file', filePath),
  
  // Video Processing
  getVideoMetadata: (videoPath) => ipcRenderer.invoke('get-video-metadata', videoPath),
  transcodeVideo: (videoPath, songFolder) => ipcRenderer.invoke('transcode-video', videoPath, songFolder),
  displayVideoSlide: (videoPath) => ipcRenderer.invoke('display-video-slide', videoPath),
  
  // Audio Transposition
  transposeAudioFiles: (params) => ipcRenderer.invoke('transpose-audio-files', params),
  convertToOgg: (params) => ipcRenderer.invoke('convert-to-ogg', params),
  
  // HTTP Server
  startHttpServer: (port) => ipcRenderer.invoke('start-http-server', port),
  stopHttpServer: () => ipcRenderer.invoke('stop-http-server'),
  
  // Audio Service
  startAudioService: (config) => ipcRenderer.invoke('start-audio-service', config),
  checkAudioServiceStatus: () => ipcRenderer.invoke('check-audio-service-status'),
  stopAudioService: () => ipcRenderer.invoke('stop-audio-service'),
  
  // Google Drive Integration
  googleDriveAuthenticate: () => ipcRenderer.invoke('google-drive-authenticate'),
  googleDriveListFiles: (folderId) => ipcRenderer.invoke('google-drive-list-files', folderId),
  googleDriveDownloadFile: (fileId, destination) => ipcRenderer.invoke('google-drive-download-file', fileId, destination),
  googleDriveSyncFolder: (folderId, localPath) => ipcRenderer.invoke('google-drive-sync-folder', folderId, localPath),
  
  // Lyrics
  fetchLyricsFromGenius: (params) => ipcRenderer.invoke('fetch-lyrics-from-genius', params),
  saveLyricsToFile: (params) => ipcRenderer.invoke('save-lyrics-to-file', params),
  fetchAndSaveLyrics: (params) => ipcRenderer.invoke('fetch-and-save-lyrics', params),
  
  // MIDI
  getAvailableMidiInputs: () => ipcRenderer.invoke('get-available-midi-inputs'),
  getAvailableMidiOutputs: () => ipcRenderer.invoke('get-available-midi-outputs'),
  executeMacro: (macroData) => ipcRenderer.invoke('execute-macro', macroData),
  
  // DMX
  getDmxFixtures: () => ipcRenderer.invoke('get-dmx-fixtures'),
  addDmxFixture: (fixture) => ipcRenderer.invoke('add-dmx-fixture', fixture),
  updateDmxFixture: (fixture) => ipcRenderer.invoke('update-dmx-fixture', fixture),
  deleteDmxFixture: (fixtureId) => ipcRenderer.invoke('delete-dmx-fixture', fixtureId),
  getDmxScenes: () => ipcRenderer.invoke('get-dmx-scenes'),
  createDmxScene: (scene) => ipcRenderer.invoke('create-dmx-scene', scene),
  updateDmxScene: (scene) => ipcRenderer.invoke('update-dmx-scene', scene),
  deleteDmxScene: (sceneId) => ipcRenderer.invoke('delete-dmx-scene', sceneId),
  recallDmxScene: (sceneId) => ipcRenderer.invoke('recall-dmx-scene', sceneId),
  
  // Performance
  getPerformanceMetrics: () => ipcRenderer.invoke('get-performance-metrics'),
  
  // System Info
  getAvailableDisplays: () => ipcRenderer.invoke('get-available-displays'),
  getAvailableAudioDevices: () => ipcRenderer.invoke('get-available-audio-devices'),
  
  // Window Management
  openAudienceWindow: () => ipcRenderer.invoke('open-audience-window'),
  openConfidenceWindow: () => ipcRenderer.invoke('open-confidence-window'),
  openLowerThirdsWindow: () => ipcRenderer.invoke('open-lowerthirds-window'),
  openPreserviceWindow: () => ipcRenderer.invoke('open-preservice-music-window'),
  closePreserviceWindow: () => ipcRenderer.invoke('close-preservice-music-window'),
  openSchedulerWindow: () => ipcRenderer.invoke('open-scheduler-window'),
  
  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Event Listeners
  on: (channel, callback) => {
    const validChannels = [
      'display-settings-clicked',
      'video-transcode-progress',
      'transpose-progress',
      'audio-conversion-progress',
      'google-drive-download-progress',
      'google-drive-sync-progress',
      'video-ended',
      'tracks-updated'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove event listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // Send events to other windows
  sendToAudience: (channel, data) => ipcRenderer.send('send-to-audience', channel, data),
  sendToConfidence: (channel, data) => ipcRenderer.send('send-to-confidence', channel, data),
  sendToLowerThirds: (channel, data) => ipcRenderer.send('send-to-lowerthirds', channel, data)
});

// Also expose a compatibility layer for existing Tauri code
contextBridge.exposeInMainWorld('__TAURI__', {
  invoke: (cmd, args) => {
    // Map Tauri commands to Electron IPC
    const commandMap = {
      'generate_background_css': 'generate-background-css',
      'open_lyrics_file': 'open-lyrics-file',
      'get_video_metadata': 'get-video-metadata',
      'transcode_video': 'transcode-video',
      'display_video_slide': 'display-video-slide',
      'transpose_audio_files': 'transpose-audio-files',
      'convert_to_ogg': 'convert-to-ogg',
      'start_http_server': 'start-http-server',
      'stop_http_server': 'stop-http-server',
      'start_audio_service': 'start-audio-service',
      'check_audio_service_status': 'check-audio-service-status',
      'stop_audio_service': 'stop-audio-service',
      'fetch_lyrics_from_genius': 'fetch-lyrics-from-genius',
      'save_lyrics_to_file': 'save-lyrics-to-file',
      'fetch_and_save_lyrics': 'fetch-and-save-lyrics',
      'get_available_midi_inputs': 'get-available-midi-inputs',
      'get_available_midi_outputs': 'get-available-midi-outputs',
      'execute_macro': 'execute-macro',
      'get_dmx_fixtures': 'get-dmx-fixtures',
      'add_dmx_fixture': 'add-dmx-fixture',
      'update_dmx_fixture': 'update-dmx-fixture',
      'delete_dmx_fixture': 'delete-dmx-fixture',
      'get_dmx_scenes': 'get-dmx-scenes',
      'create_dmx_scene': 'create-dmx-scene',
      'update_dmx_scene': 'update-dmx-scene',
      'delete_dmx_scene': 'delete-dmx-scene',
      'recall_dmx_scene': 'recall-dmx-scene',
      'get_performance_metrics': 'get-performance-metrics',
      'get_available_displays': 'get-available-displays',
      'get_available_audio_devices': 'get-available-audio-devices',
      'open_preservice_music_window': 'open-preservice-music-window',
      'close_preservice_music_window': 'close-preservice-music-window',
      'open_scheduler_window': 'open-scheduler-window'
    };
    
    const electronChannel = commandMap[cmd];
    if (electronChannel) {
      return ipcRenderer.invoke(electronChannel, args);
    }
    
    return Promise.reject(new Error(`Unknown command: ${cmd}`));
  },
  
  event: {
    listen: (event, handler) => {
      ipcRenderer.on(event, (e, payload) => handler({ payload }));
      return Promise.resolve(() => {
        ipcRenderer.removeListener(event, handler);
      });
    },
    emit: (event, payload) => {
      // Emit to main window
      ipcRenderer.send(event, payload);
      return Promise.resolve();
    }
  }
});

console.log('Electron preload script loaded');
