const { app, BrowserWindow, ipcMain, Menu, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs-extra');

// Import backend modules
const fileManager = require('./modules/fileManager.cjs');
const videoProcessor = require('./modules/videoProcessor.cjs');
const audioTransposer = require('./modules/audioTransposer.cjs');
const lyricsManager = require('./modules/lyricsManager.cjs');
const databaseManager = require('./modules/databaseManager.cjs');
const googleDriveManager = require('./modules/googleDriveManager.cjs');
const midiManager = require('./modules/midiManager.cjs');
const dmxManager = require('./modules/dmxManager.cjs');
const httpServer = require('./modules/httpServer.cjs');
const audioServiceManager = require('./modules/audioServiceManager.cjs');
const performanceMonitor = require('./modules/performanceMonitor.cjs');

// Global state
let mainWindow = null;
let audienceWindow = null;
let confidenceWindow = null;
let lowerThirdsWindow = null;
let preserviceWindow = null;
let schedulerWindow = null;

// Development mode check
const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = 'http://localhost:5174';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // Create menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow) mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Display Settings',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('display-settings-clicked');
            }
          }
        }
      ]
    }
  ]);
  
  mainWindow.setMenu(menu);

  // Load the app
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', async (event) => {
    // Prevent default close to handle cleanup
    event.preventDefault();
    
    // Close all other windows
    [audienceWindow, confidenceWindow, lowerThirdsWindow, preserviceWindow, schedulerWindow].forEach(win => {
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
    });

    // Stop HTTP server
    await httpServer.stop();
    
    // Stop audio service
    await audioServiceManager.stop();

    // Actually quit
    app.exit(0);
  });
}

function createAudienceWindow() {
  if (audienceWindow && !audienceWindow.isDestroyed()) {
    audienceWindow.show();
    return;
  }

  audienceWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  if (isDev) {
    audienceWindow.loadURL(`${VITE_DEV_SERVER_URL}/audience.html`);
  } else {
    audienceWindow.loadFile(path.join(__dirname, '../dist/audience.html'));
  }

  audienceWindow.once('ready-to-show', () => {
    audienceWindow.show();
  });

  audienceWindow.on('closed', () => {
    audienceWindow = null;
  });
}

function createConfidenceWindow() {
  if (confidenceWindow && !confidenceWindow.isDestroyed()) {
    confidenceWindow.show();
    return;
  }

  confidenceWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  if (isDev) {
    confidenceWindow.loadURL(`${VITE_DEV_SERVER_URL}/confidence.html`);
    confidenceWindow.webContents.openDevTools();
  } else {
    confidenceWindow.loadFile(path.join(__dirname, '../dist/confidence.html'));
  }

  confidenceWindow.once('ready-to-show', () => {
    confidenceWindow.show();
  });

  confidenceWindow.on('closed', () => {
    confidenceWindow = null;
  });
}

function createLowerThirdsWindow() {
  if (lowerThirdsWindow && !lowerThirdsWindow.isDestroyed()) {
    lowerThirdsWindow.show();
    return;
  }

  lowerThirdsWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  if (isDev) {
    lowerThirdsWindow.loadURL(`${VITE_DEV_SERVER_URL}/lowerthirds.html`);
  } else {
    lowerThirdsWindow.loadFile(path.join(__dirname, '../dist/lowerthirds.html'));
  }

  lowerThirdsWindow.once('ready-to-show', () => {
    lowerThirdsWindow.show();
  });

  lowerThirdsWindow.on('closed', () => {
    lowerThirdsWindow = null;
  });
}

function createPreserviceWindow() {
  if (preserviceWindow && !preserviceWindow.isDestroyed()) {
    preserviceWindow.show();
    return;
  }

  preserviceWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  if (isDev) {
    preserviceWindow.loadURL(`${VITE_DEV_SERVER_URL}/preservice-music.html`);
  } else {
    preserviceWindow.loadFile(path.join(__dirname, '../dist/preservice-music.html'));
  }

  preserviceWindow.once('ready-to-show', () => {
    preserviceWindow.show();
  });

  preserviceWindow.on('closed', () => {
    preserviceWindow = null;
  });
}

function createSchedulerWindow() {
  if (schedulerWindow && !schedulerWindow.isDestroyed()) {
    schedulerWindow.show();
    return;
  }

  schedulerWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  if (isDev) {
    schedulerWindow.loadURL(`${VITE_DEV_SERVER_URL}/scheduler.html`);
  } else {
    schedulerWindow.loadFile(path.join(__dirname, '../dist/scheduler.html'));
  }

  schedulerWindow.once('ready-to-show', () => {
    schedulerWindow.show();
  });

  schedulerWindow.on('closed', () => {
    schedulerWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize database
  databaseManager.initialize();
  
  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// File Management
ipcMain.handle('generate-background-css', async (event, folderPath) => {
  return fileManager.generateBackgroundCSS(folderPath);
});

ipcMain.handle('open-lyrics-file', async (event, filePath) => {
  return fileManager.openLyricsFile(filePath);
});

// Video Processing
ipcMain.handle('get-video-metadata', async (event, videoPath) => {
  return videoProcessor.getVideoMetadata(videoPath);
});

ipcMain.handle('transcode-video', async (event, videoPath, songFolder) => {
  return videoProcessor.transcodeVideo(videoPath, songFolder, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('video-transcode-progress', progress);
    }
  });
});

ipcMain.handle('display-video-slide', async (event, videoPath) => {
  return videoProcessor.displayVideoSlide(videoPath);
});

// Audio Transposition
ipcMain.handle('transpose-audio-files', async (event, params) => {
  return audioTransposer.transposeAudioFiles(params, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('transpose-progress', progress);
    }
  });
});

ipcMain.handle('convert-to-ogg', async (event, params) => {
  return audioTransposer.convertToOgg(params, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('audio-conversion-progress', progress);
    }
  });
});

// HTTP Server
ipcMain.handle('start-http-server', async (event, port) => {
  return httpServer.start(port);
});

ipcMain.handle('stop-http-server', async () => {
  return httpServer.stop();
});

// Audio Service
ipcMain.handle('start-audio-service', async (event, config) => {
  return audioServiceManager.start(config);
});

ipcMain.handle('check-audio-service-status', async () => {
  return audioServiceManager.checkStatus();
});

ipcMain.handle('stop-audio-service', async () => {
  return audioServiceManager.stop();
});

// Google Drive Integration
ipcMain.handle('google-drive-authenticate', async () => {
  return googleDriveManager.authenticate();
});

ipcMain.handle('google-drive-list-files', async (event, folderId) => {
  return googleDriveManager.listFiles(folderId);
});

ipcMain.handle('google-drive-download-file', async (event, fileId, destination) => {
  return googleDriveManager.downloadFile(fileId, destination, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('google-drive-download-progress', progress);
    }
  });
});

ipcMain.handle('google-drive-sync-folder', async (event, folderId, localPath) => {
  return googleDriveManager.syncFolder(folderId, localPath, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('google-drive-sync-progress', progress);
    }
  });
});

// Lyrics
ipcMain.handle('fetch-lyrics-from-genius', async (event, params) => {
  return lyricsManager.fetchFromGenius(params);
});

ipcMain.handle('save-lyrics-to-file', async (event, params) => {
  return lyricsManager.saveToFile(params);
});

ipcMain.handle('fetch-and-save-lyrics', async (event, params) => {
  return lyricsManager.fetchAndSave(params);
});

// MIDI
ipcMain.handle('get-available-midi-inputs', async () => {
  return midiManager.getInputs();
});

ipcMain.handle('get-available-midi-outputs', async () => {
  return midiManager.getOutputs();
});

ipcMain.handle('execute-macro', async (event, macroData) => {
  return midiManager.executeMacro(macroData);
});

// DMX
ipcMain.handle('get-dmx-fixtures', async () => {
  return dmxManager.getFixtures();
});

ipcMain.handle('add-dmx-fixture', async (event, fixture) => {
  return dmxManager.addFixture(fixture);
});

ipcMain.handle('update-dmx-fixture', async (event, fixture) => {
  return dmxManager.updateFixture(fixture);
});

ipcMain.handle('delete-dmx-fixture', async (event, fixtureId) => {
  return dmxManager.deleteFixture(fixtureId);
});

ipcMain.handle('get-dmx-scenes', async () => {
  return dmxManager.getScenes();
});

ipcMain.handle('create-dmx-scene', async (event, scene) => {
  return dmxManager.createScene(scene);
});

ipcMain.handle('update-dmx-scene', async (event, scene) => {
  return dmxManager.updateScene(scene);
});

ipcMain.handle('delete-dmx-scene', async (event, sceneId) => {
  return dmxManager.deleteScene(sceneId);
});

ipcMain.handle('recall-dmx-scene', async (event, sceneId) => {
  return dmxManager.recallScene(sceneId);
});

// Performance
ipcMain.handle('get-performance-metrics', async () => {
  return performanceMonitor.getMetrics();
});

// System Info
ipcMain.handle('get-available-displays', async () => {
  return screen.getAllDisplays().map(display => ({
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    internal: display.internal
  }));
});

ipcMain.handle('get-available-audio-devices', async () => {
  // Will be implemented in audio service
  return [];
});

// Window Management
ipcMain.handle('open-audience-window', () => {
  createAudienceWindow();
  return { success: true };
});

ipcMain.handle('open-confidence-window', () => {
  createConfidenceWindow();
  return { success: true };
});

ipcMain.handle('open-lowerthirds-window', () => {
  createLowerThirdsWindow();
  return { success: true };
});

ipcMain.handle('open-preservice-music-window', () => {
  createPreserviceWindow();
  return { success: true };
});

ipcMain.handle('close-preservice-music-window', () => {
  if (preserviceWindow && !preserviceWindow.isDestroyed()) {
    preserviceWindow.close();
  }
  return { success: true };
});

ipcMain.handle('open-scheduler-window', () => {
  createSchedulerWindow();
  return { success: true };
});

// Dialog handlers
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Event forwarding to other windows
ipcMain.on('send-to-audience', (event, channel, data) => {
  if (audienceWindow && !audienceWindow.isDestroyed()) {
    audienceWindow.webContents.send(channel, data);
  }
});

ipcMain.on('send-to-confidence', (event, channel, data) => {
  if (confidenceWindow && !confidenceWindow.isDestroyed()) {
    confidenceWindow.webContents.send(channel, data);
  }
});

ipcMain.on('send-to-lowerthirds', (event, channel, data) => {
  if (lowerThirdsWindow && !lowerThirdsWindow.isDestroyed()) {
    lowerThirdsWindow.webContents.send(channel, data);
  }
});

console.log('HarmonySync Electron backend initialized');
