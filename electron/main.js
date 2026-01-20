const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, exec } = require('child_process');
const os = require('os');

// Import backend services
const database = require('./services/database');
const ffmpegService = require('./services/ffmpeg');
const audioService = require('./services/audio-service');
const videoService = require('./services/video-service');
const youtubeService = require('./services/youtube-service');
const imageService = require('./services/image-service');
const textService = require('./services/text-service');
const displayService = require('./services/display-service');
const windowService = require('./services/window-service');
const macroService = require('./services/macro-service');
const schedulerService = require('./services/scheduler-service');
const httpServer = require('./services/http-server');
const midiManager = require('./services/midi-manager');
const lyricsFetcher = require('./services/lyrics-fetcher');
const fileManager = require('./services/file-manager');
const googleDriveService = require('./services/google-drive');
const dropboxService = require('./services/dropbox-service');
const scriptService = require('./services/script-service');
const scriptingAPI = require('./services/scripting-api');

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = 'http://localhost:5174';

let mainWindow = null;
let audienceWindow = null;
let confidenceWindow = null;
let lowerThirdsWindow = null;
let audioServiceProcess = null;

// Create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../harmonysync/icons/icon.png')
  });

  // Create menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Display Settings',
          click: () => {
            mainWindow.webContents.send('display-settings-clicked');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    mainWindow.loadURL(`${VITE_DEV_SERVER_URL}/index.html`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../harmonysync/dist/index.html'));
  }

  mainWindow.on('close', async (e) => {
    e.preventDefault();
    
    // Close all windows
    if (audienceWindow) audienceWindow.close();
    if (confidenceWindow) confidenceWindow.close();
    if (lowerThirdsWindow) lowerThirdsWindow.close();
    
    // Stop services
    await httpServer.stop();
    await stopAudioService();
    
    mainWindow.destroy();
    app.quit();
  });

  return mainWindow;
}

// Create audience window
function createAudienceWindow() {
  audienceWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  if (isDev) {
    audienceWindow.loadURL(`${VITE_DEV_SERVER_URL}/audience.html`);
  } else {
    audienceWindow.loadFile(path.join(__dirname, '../harmonysync/dist/audience.html'));
  }

  return audienceWindow;
}

// Create confidence monitor window
function createConfidenceWindow() {
  confidenceWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  if (isDev) {
    confidenceWindow.loadURL(`${VITE_DEV_SERVER_URL}/confidence.html`);
    confidenceWindow.webContents.openDevTools();
  } else {
    confidenceWindow.loadFile(path.join(__dirname, '../harmonysync/dist/confidence.html'));
  }

  return confidenceWindow;
}

// Create lower thirds window
function createLowerThirdsWindow() {
  lowerThirdsWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  if (isDev) {
    lowerThirdsWindow.loadURL(`${VITE_DEV_SERVER_URL}/lowerthirds.html`);
  } else {
    lowerThirdsWindow.loadFile(path.join(__dirname, '../harmonysync/dist/lowerthirds.html'));
  }

  return lowerThirdsWindow;
}

// Start audio service
async function startAudioService() {
  return new Promise((resolve, reject) => {
    const servicePath = path.join(__dirname, '../harmonysync-audio-service/server.js');
    
    audioServiceProcess = spawn('node', [servicePath], {
      env: {
        ...process.env,
        PORT: '3001',
        HOST: '127.0.0.1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    audioServiceProcess.stdout.on('data', (data) => {
      console.log(`Audio Service: ${data}`);
      if (data.toString().includes('listening')) {
        resolve();
      }
    });

    audioServiceProcess.stderr.on('data', (data) => {
      console.error(`Audio Service Error: ${data}`);
    });

    audioServiceProcess.on('error', (error) => {
      console.error('Failed to start audio service:', error);
      reject(error);
    });

    audioServiceProcess.on('exit', (code) => {
      console.log(`Audio service exited with code ${code}`);
      audioServiceProcess = null;
    });

    // Timeout after 10 seconds
    setTimeout(() => resolve(), 10000);
  });
}

// Stop audio service
async function stopAudioService() {
  if (audioServiceProcess) {
    audioServiceProcess.kill('SIGTERM');
    audioServiceProcess = null;
  }
}

// App initialization
app.whenReady().then(async () => {
  try {
    // Initialize database
    await database.initialize();
    
    // Start HTTP server for video streaming
    await httpServer.start();
    
    // Start audio service
    await startAudioService();
    
    // Initialize MIDI
    await midiManager.initialize();
    
    // Create windows
    createMainWindow();
    createAudienceWindow();
    createConfidenceWindow();
    createLowerThirdsWindow();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// IPC Handlers
require('./ipc-handlers')(ipcMain, {
  mainWindow: () => mainWindow,
  audienceWindow: () => audienceWindow,
  confidenceWindow: () => confidenceWindow,
  lowerThirdsWindow: () => lowerThirdsWindow,
  database,
  ffmpegService,
  audioService,
  videoService,
  youtubeService,
  imageService,
  textService,
  displayService,
  windowService,
  macroService,
  schedulerService,
  httpServer,
  midiManager,
  lyricsFetcher,
  fileManager,
  googleDriveService,
  dropboxService,
  scriptService,
  scriptingAPI
});

// Initialize script storage
scriptService.initializeScriptStorage().catch(err => {
  console.error('Failed to initialize script storage:', err);
});

// Export for other modules
module.exports = {
  getMainWindow: () => mainWindow,
  getAudienceWindow: () => audienceWindow,
  getConfidenceWindow: () => confidenceWindow,
  getLowerThirdsWindow: () => lowerThirdsWindow
};
