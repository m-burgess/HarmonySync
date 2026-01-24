/**
 * Remote Control Service
 * Provides a REST API for controlling HarmonySync Presenter from mobile devices
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

/**
 * Simple rate limiting middleware
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = rateLimitMap.get(ip);
  
  if (now > record.resetTime) {
    // Reset the window
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
  
  record.count++;
  next();
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Shared application state
const appState = {
  currentFolder: null,
  currentSlideIndex: 0,
  totalSlides: 0,
  playbackStatus: 'stopped', // 'playing', 'stopped', 'paused'
  playbackPosition: 0,
  loadedTracks: [],
  setlistDirectory: null
};

let server = null;
let app = null;
let mainWindow = null;
const PORT = 3000;
let cachedIPAddress = null; // Cache IP address to avoid recalculation

/**
 * Get the local network IP address
 * @returns {string} The IP address or 'localhost' if not found
 * 
 * Note: This function is duplicated in http-server.js. In a future refactor,
 * consider extracting to a shared utility module (e.g., network-utils.js)
 * to avoid code duplication.
 */
function getLocalIPAddress() {
  // Return cached value if available
  if (cachedIPAddress) {
    return cachedIPAddress;
  }
  
  const interfaces = os.networkInterfaces();
  
  // Try to find local IP address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        cachedIPAddress = iface.address;
        return cachedIPAddress;
      }
    }
  }
  
  cachedIPAddress = 'localhost';
  return cachedIPAddress;
}

/**
 * Initialize the remote control service
 * @param {Function} getMainWindow - Function to get the main window instance
 */
function initialize(getMainWindow) {
  mainWindow = getMainWindow;
}

/**
 * Start the remote control REST API server
 */
async function start() {
  if (server) {
    console.log('[RemoteControl] Server already running');
    return;
  }

  app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Apply rate limiting to API routes
  // Note: This middleware applies to ALL routes starting with /api
  // CodeQL may flag individual routes as missing rate limiting, but this is a false positive
  app.use('/api', rateLimiter);

  // Serve static files from public directory
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[RemoteControl] ${req.method} ${req.path}`);
    next();
  });

  // ==================== API Routes ====================

  /**
   * GET /api/status
   * Get current application state
   */
  app.get('/api/status', (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          currentFolder: appState.currentFolder,
          currentSlideIndex: appState.currentSlideIndex,
          totalSlides: appState.totalSlides,
          playbackStatus: appState.playbackStatus,
          playbackPosition: appState.playbackPosition,
          loadedTracks: appState.loadedTracks.map(t => ({
            name: path.basename(t),
            path: t
          }))
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error getting status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/folders
   * List available song folders from the setlist directory
   */
  app.get('/api/folders', async (req, res) => {
    try {
      const setlistDir = appState.setlistDirectory;
      
      if (!setlistDir || !await fs.pathExists(setlistDir)) {
        return res.json({
          success: true,
          data: [],
          message: 'No setlist directory configured'
        });
      }

      const items = await fs.readdir(setlistDir);
      const folders = [];

      for (const item of items) {
        const itemPath = path.join(setlistDir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          // Check if directory contains audio files
          const files = await fs.readdir(itemPath);
          const hasAudio = files.some(f => 
            f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')
          );

          folders.push({
            name: item,
            path: itemPath,
            hasAudio
          });
        }
      }

      res.json({
        success: true,
        data: folders
      });
    } catch (error) {
      console.error('[RemoteControl] Error listing folders:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/folder/select
   * Select and load a folder
   * Body: { folderPath: string }
   */
  app.post('/api/folder/select', async (req, res) => {
    try {
      const { folderPath } = req.body;

      if (!folderPath) {
        return res.status(400).json({
          success: false,
          error: 'folderPath is required'
        });
      }

      if (!await fs.pathExists(folderPath)) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }

      // Update state
      appState.currentFolder = folderPath;
      appState.currentSlideIndex = 0;

      // Scan for slides and audio files
      const files = await fs.readdir(folderPath);
      const slideFiles = files.filter(f => 
        f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
      ).sort();
      
      const audioFiles = files.filter(f => 
        f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')
      ).map(f => path.join(folderPath, f));

      appState.totalSlides = slideFiles.length;
      appState.loadedTracks = audioFiles;

      // Notify main window
      const win = mainWindow();
      if (win) {
        win.webContents.send('remote:folder-selected', {
          folderPath,
          slides: slideFiles,
          audioTracks: audioFiles
        });
      }

      res.json({
        success: true,
        data: {
          folderPath: appState.currentFolder,
          totalSlides: appState.totalSlides,
          audioTracks: appState.loadedTracks.length
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error selecting folder:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/slide/next
   * Advance to next slide
   */
  app.post('/api/slide/next', (req, res) => {
    try {
      if (!appState.currentFolder) {
        return res.status(400).json({
          success: false,
          error: 'No folder loaded'
        });
      }

      if (appState.currentSlideIndex < appState.totalSlides - 1) {
        appState.currentSlideIndex++;
        
        // Notify main window
        const win = mainWindow();
        if (win) {
          win.webContents.send('remote:slide-next', {
            slideIndex: appState.currentSlideIndex
          });
        }

        res.json({
          success: true,
          data: {
            currentSlideIndex: appState.currentSlideIndex,
            totalSlides: appState.totalSlides
          }
        });
      } else {
        res.json({
          success: false,
          message: 'Already at last slide'
        });
      }
    } catch (error) {
      console.error('[RemoteControl] Error advancing slide:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/slide/previous
   * Go to previous slide
   */
  app.post('/api/slide/previous', (req, res) => {
    try {
      if (!appState.currentFolder) {
        return res.status(400).json({
          success: false,
          error: 'No folder loaded'
        });
      }

      if (appState.currentSlideIndex > 0) {
        appState.currentSlideIndex--;
        
        // Notify main window
        const win = mainWindow();
        if (win) {
          win.webContents.send('remote:slide-previous', {
            slideIndex: appState.currentSlideIndex
          });
        }

        res.json({
          success: true,
          data: {
            currentSlideIndex: appState.currentSlideIndex,
            totalSlides: appState.totalSlides
          }
        });
      } else {
        res.json({
          success: false,
          message: 'Already at first slide'
        });
      }
    } catch (error) {
      console.error('[RemoteControl] Error going to previous slide:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/playback/play
   * Start multitrack playback
   */
  app.post('/api/playback/play', (req, res) => {
    try {
      if (appState.loadedTracks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No audio tracks loaded'
        });
      }

      appState.playbackStatus = 'playing';
      
      // Notify main window
      const win = mainWindow();
      if (win) {
        win.webContents.send('remote:playback-play');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: appState.playbackStatus
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error starting playback:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/playback/stop
   * Stop multitrack playback
   */
  app.post('/api/playback/stop', (req, res) => {
    try {
      appState.playbackStatus = 'stopped';
      appState.playbackPosition = 0;
      
      // Notify main window
      const win = mainWindow();
      if (win) {
        win.webContents.send('remote:playback-stop');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: appState.playbackStatus
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error stopping playback:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/playback/pause
   * Pause multitrack playback
   */
  app.post('/api/playback/pause', (req, res) => {
    try {
      appState.playbackStatus = 'paused';
      
      // Notify main window
      const win = mainWindow();
      if (win) {
        win.webContents.send('remote:playback-pause');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: appState.playbackStatus
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error pausing playback:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/playback/status
   * Get current playback status
   */
  app.get('/api/playback/status', (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          status: appState.playbackStatus,
          position: appState.playbackPosition,
          tracksLoaded: appState.loadedTracks.length
        }
      });
    } catch (error) {
      console.error('[RemoteControl] Error getting playback status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('[RemoteControl] Server error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  // Start server
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, '0.0.0.0', (err) => {
      if (err) {
        console.error('[RemoteControl] Failed to start server:', err);
        reject(err);
      } else {
        const ipAddress = getLocalIPAddress();
        
        console.log(`[RemoteControl] Server listening on:`);
        console.log(`  - Local:   http://localhost:${PORT}`);
        console.log(`  - Network: http://${ipAddress}:${PORT}`);
        console.log(`[RemoteControl] Mobile interface: http://${ipAddress}:${PORT}/mobile-control.html`);
        resolve();
      }
    });
  });
}

/**
 * Stop the remote control server
 */
async function stop() {
  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        console.log('[RemoteControl] Server stopped');
        server = null;
        app = null;
        resolve();
      });
    });
  }
}

/**
 * Get the server URL
 */
function getUrl() {
  const ipAddress = getLocalIPAddress();
  
  return {
    local: `http://localhost:${PORT}`,
    network: `http://${ipAddress}:${PORT}`,
    mobile: `http://${ipAddress}:${PORT}/mobile-control.html`
  };
}

/**
 * Update application state (called from IPC handlers)
 */
function updateState(updates) {
  Object.assign(appState, updates);
}

/**
 * Get current application state
 */
function getState() {
  return { ...appState };
}

/**
 * Set the setlist directory
 */
function setSetlistDirectory(directory) {
  appState.setlistDirectory = directory;
}

module.exports = {
  initialize,
  start,
  stop,
  getUrl,
  updateState,
  getState,
  setSetlistDirectory
};
