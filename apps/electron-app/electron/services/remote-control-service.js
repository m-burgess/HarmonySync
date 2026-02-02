"use strict";
/**
 * Remote Control Service
 * Provides a REST API for controlling HarmonySync Presenter from mobile devices
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteControlService = void 0;
exports.createRemoteControlService = createRemoteControlService;
exports.initialize = initialize;
exports.start = start;
exports.stop = stop;
exports.getUrl = getUrl;
exports.updateState = updateState;
exports.getState = getState;
exports.setSetlistDirectory = setSetlistDirectory;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const services_1 = require("../types/services");
// Rate limiting constants
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
/**
 * Remote Control Service Implementation
 * Provides REST API for remote control of presentations and playback
 */
class RemoteControlService extends services_1.BaseElectronService {
    constructor(getMainWindow, port = 3000, config) {
        super(config);
        this.serviceName = 'RemoteControlService';
        this.server = null;
        this.app = null;
        this.cachedIPAddress = null;
        this.rateLimitMap = new Map();
        // Application state
        this.appState = {
            currentFolder: null,
            currentSlideIndex: 0,
            totalSlides: 0,
            playbackStatus: 'stopped',
            playbackPosition: 0,
            loadedTracks: [],
            setlistDirectory: null
        };
        this.getMainWindow = getMainWindow;
        this.port = port;
        this.startRateLimitCleanup();
    }
    /**
     * Initialize the remote control service
     */
    async onInitialize() {
        this.log('info', 'Remote control service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.app = null;
        }
        this.rateLimitMap.clear();
        this.log('info', 'Remote control service disposed');
    }
    /**
     * Start the remote control REST API server
     * @param port - Optional port override
     */
    async start(port) {
        const serverPort = port || this.port;
        if (this.server) {
            this.log('warn', 'Remote control server already running');
            return;
        }
        this.app = (0, express_1.default)();
        // Middleware
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Apply rate limiting to API routes
        this.app.use('/api', this.createRateLimiter());
        // Serve static files from public directory
        const publicDir = path.join(__dirname, '../public');
        this.app.use(express_1.default.static(publicDir));
        // Logging middleware
        this.app.use(this.createLoggingMiddleware());
        // Setup routes
        this.setupRoutes();
        // Error handling middleware
        this.app.use(this.createErrorHandler());
        // Start server
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(serverPort, '0.0.0.0', (err) => {
                    if (err) {
                        this.log('error', 'Failed to start remote control server:', err);
                        reject(err);
                    }
                    else {
                        const ipAddress = this.getLocalIPAddress();
                        this.log('info', `Remote control server listening on:`);
                        this.log('info', `  - Local:   http://localhost:${serverPort}`);
                        this.log('info', `  - Network: http://${ipAddress}:${serverPort}`);
                        this.log('info', `  - Mobile:  http://${ipAddress}:${serverPort}/mobile-control.html`);
                        this.emit('started', { port: serverPort, ipAddress });
                        resolve();
                    }
                });
            }
            catch (error) {
                this.handleError('start', error);
            }
        });
    }
    /**
     * Stop the remote control server
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.log('info', 'Remote control server stopped');
                    this.server = null;
                    this.app = null;
                    this.emit('stopped');
                    resolve();
                });
            });
        }
    }
    /**
     * Get the server status
     */
    async getStatus() {
        if (this.server) {
            return {
                running: true,
                urls: this.getUrl()
            };
        }
        return { running: false };
    }
    /**
     * Get the server URLs
     */
    getUrl() {
        const ipAddress = this.getLocalIPAddress();
        return {
            local: `http://localhost:${this.port}`,
            network: `http://${ipAddress}:${this.port}`,
            mobile: `http://${ipAddress}:${this.port}/mobile-control.html`
        };
    }
    /**
     * Update application state (called from IPC handlers)
     */
    updateState(updates) {
        Object.assign(this.appState, updates);
        this.emit('state-updated', this.appState);
    }
    /**
     * Get current application state
     */
    getState() {
        return { ...this.appState };
    }
    /**
     * Set the setlist directory
     */
    setSetlistDirectory(directory) {
        this.appState.setlistDirectory = directory;
    }
    /**
     * Get the local network IP address
     * @returns The IP address or 'localhost' if not found
     */
    getLocalIPAddress() {
        // Return cached value if available
        if (this.cachedIPAddress) {
            return this.cachedIPAddress;
        }
        const interfaces = os.networkInterfaces();
        // Try to find local IP address
        for (const name of Object.keys(interfaces)) {
            const ifaces = interfaces[name];
            if (!ifaces)
                continue;
            for (const iface of ifaces) {
                // Skip internal and non-IPv4 addresses
                if (!iface.internal && iface.family === 'IPv4') {
                    this.cachedIPAddress = iface.address;
                    return this.cachedIPAddress;
                }
            }
        }
        this.cachedIPAddress = 'localhost';
        return this.cachedIPAddress;
    }
    /**
     * Create rate limiting middleware
     */
    createRateLimiter() {
        return (req, res, next) => {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const now = Date.now();
            if (!this.rateLimitMap.has(ip)) {
                this.rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
                return next();
            }
            const record = this.rateLimitMap.get(ip);
            if (now > record.resetTime) {
                // Reset the window
                record.count = 1;
                record.resetTime = now + RATE_LIMIT_WINDOW;
                return next();
            }
            if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
                res.status(429).json({
                    success: false,
                    error: 'Too many requests, please try again later'
                });
                return;
            }
            record.count++;
            next();
        };
    }
    /**
     * Start rate limit cleanup interval
     */
    startRateLimitCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [ip, record] of this.rateLimitMap.entries()) {
                if (now > record.resetTime) {
                    this.rateLimitMap.delete(ip);
                }
            }
        }, RATE_LIMIT_WINDOW);
    }
    /**
     * Create logging middleware
     */
    createLoggingMiddleware() {
        return (req, _res, next) => {
            this.log('debug', `${req.method} ${req.path}`);
            next();
        };
    }
    /**
     * Create error handling middleware
     */
    createErrorHandler() {
        return (err, _req, res, _next) => {
            this.log('error', 'Server error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        };
    }
    /**
     * Setup all API routes
     */
    setupRoutes() {
        if (!this.app)
            return;
        // Status routes
        this.app.get('/api/status', this.handleGetStatus.bind(this));
        this.app.get('/api/playback/status', this.handleGetPlaybackStatus.bind(this));
        // Folder routes
        this.app.get('/api/folders', this.handleGetFolders.bind(this));
        this.app.post('/api/folder/select', this.handleSelectFolder.bind(this));
        // Slide routes
        this.app.post('/api/slide/next', this.handleSlideNext.bind(this));
        this.app.post('/api/slide/previous', this.handleSlidePrevious.bind(this));
        // Playback routes
        this.app.post('/api/playback/play', this.handlePlaybackPlay.bind(this));
        this.app.post('/api/playback/stop', this.handlePlaybackStop.bind(this));
        this.app.post('/api/playback/pause', this.handlePlaybackPause.bind(this));
    }
    /**
     * GET /api/status
     * Get current application state
     */
    handleGetStatus(_req, res) {
        try {
            res.json({
                success: true,
                data: {
                    currentFolder: this.appState.currentFolder,
                    currentSlideIndex: this.appState.currentSlideIndex,
                    totalSlides: this.appState.totalSlides,
                    playbackStatus: this.appState.playbackStatus,
                    playbackPosition: this.appState.playbackPosition,
                    loadedTracks: this.appState.loadedTracks.map(t => ({
                        name: path.basename(t),
                        path: t
                    }))
                }
            });
        }
        catch (error) {
            this.log('error', 'Error getting status:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * GET /api/folders
     * List available song folders from the setlist directory
     */
    async handleGetFolders(_req, res) {
        try {
            const setlistDir = this.appState.setlistDirectory;
            if (!setlistDir || !await fs.pathExists(setlistDir)) {
                res.json({
                    success: true,
                    data: [],
                    message: 'No setlist directory configured'
                });
                return;
            }
            const items = await fs.readdir(setlistDir);
            const folders = [];
            for (const item of items) {
                const itemPath = path.join(setlistDir, item);
                const stat = await fs.stat(itemPath);
                if (stat.isDirectory()) {
                    // Check if directory contains audio files
                    const files = await fs.readdir(itemPath);
                    const hasAudio = files.some(f => f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav'));
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
        }
        catch (error) {
            this.log('error', 'Error listing folders:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/folder/select
     * Select and load a folder
     */
    async handleSelectFolder(req, res) {
        try {
            const { folderPath } = req.body;
            if (!folderPath) {
                res.status(400).json({
                    success: false,
                    error: 'folderPath is required'
                });
                return;
            }
            if (!await fs.pathExists(folderPath)) {
                res.status(404).json({
                    success: false,
                    error: 'Folder not found'
                });
                return;
            }
            // Update state
            this.appState.currentFolder = folderPath;
            this.appState.currentSlideIndex = 0;
            // Scan for slides and audio files
            const files = await fs.readdir(folderPath);
            const slideFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')).sort();
            const audioFiles = files.filter(f => f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')).map(f => path.join(folderPath, f));
            this.appState.totalSlides = slideFiles.length;
            this.appState.loadedTracks = audioFiles;
            // Notify main window
            const win = this.getMainWindow();
            if (win && !win.isDestroyed()) {
                win.webContents.send('remote:folder-selected', {
                    folderPath,
                    slides: slideFiles,
                    audioTracks: audioFiles
                });
            }
            res.json({
                success: true,
                data: {
                    folderPath: this.appState.currentFolder,
                    totalSlides: this.appState.totalSlides,
                    audioTracks: this.appState.loadedTracks.length
                }
            });
        }
        catch (error) {
            this.log('error', 'Error selecting folder:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/slide/next
     * Advance to next slide
     */
    handleSlideNext(_req, res) {
        try {
            if (!this.appState.currentFolder) {
                res.status(400).json({
                    success: false,
                    error: 'No folder loaded'
                });
                return;
            }
            if (this.appState.currentSlideIndex < this.appState.totalSlides - 1) {
                this.appState.currentSlideIndex++;
                // Notify main window
                const win = this.getMainWindow();
                if (win && !win.isDestroyed()) {
                    win.webContents.send('remote:slide-next', {
                        slideIndex: this.appState.currentSlideIndex
                    });
                }
                res.json({
                    success: true,
                    data: {
                        currentSlideIndex: this.appState.currentSlideIndex,
                        totalSlides: this.appState.totalSlides
                    }
                });
            }
            else {
                res.json({
                    success: false,
                    message: 'Already at last slide'
                });
            }
        }
        catch (error) {
            this.log('error', 'Error advancing slide:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/slide/previous
     * Go to previous slide
     */
    handleSlidePrevious(_req, res) {
        try {
            if (!this.appState.currentFolder) {
                res.status(400).json({
                    success: false,
                    error: 'No folder loaded'
                });
                return;
            }
            if (this.appState.currentSlideIndex > 0) {
                this.appState.currentSlideIndex--;
                // Notify main window
                const win = this.getMainWindow();
                if (win && !win.isDestroyed()) {
                    win.webContents.send('remote:slide-previous', {
                        slideIndex: this.appState.currentSlideIndex
                    });
                }
                res.json({
                    success: true,
                    data: {
                        currentSlideIndex: this.appState.currentSlideIndex,
                        totalSlides: this.appState.totalSlides
                    }
                });
            }
            else {
                res.json({
                    success: false,
                    message: 'Already at first slide'
                });
            }
        }
        catch (error) {
            this.log('error', 'Error going to previous slide:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/playback/play
     * Start multitrack playback
     */
    handlePlaybackPlay(_req, res) {
        try {
            if (this.appState.loadedTracks.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No audio tracks loaded'
                });
                return;
            }
            this.appState.playbackStatus = 'playing';
            // Notify main window
            const win = this.getMainWindow();
            if (win && !win.isDestroyed()) {
                win.webContents.send('remote:playback-play');
            }
            res.json({
                success: true,
                data: {
                    playbackStatus: this.appState.playbackStatus
                }
            });
        }
        catch (error) {
            this.log('error', 'Error starting playback:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/playback/stop
     * Stop multitrack playback
     */
    handlePlaybackStop(_req, res) {
        try {
            this.appState.playbackStatus = 'stopped';
            this.appState.playbackPosition = 0;
            // Notify main window
            const win = this.getMainWindow();
            if (win && !win.isDestroyed()) {
                win.webContents.send('remote:playback-stop');
            }
            res.json({
                success: true,
                data: {
                    playbackStatus: this.appState.playbackStatus
                }
            });
        }
        catch (error) {
            this.log('error', 'Error stopping playback:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /api/playback/pause
     * Pause multitrack playback
     */
    handlePlaybackPause(_req, res) {
        try {
            this.appState.playbackStatus = 'paused';
            // Notify main window
            const win = this.getMainWindow();
            if (win && !win.isDestroyed()) {
                win.webContents.send('remote:playback-pause');
            }
            res.json({
                success: true,
                data: {
                    playbackStatus: this.appState.playbackStatus
                }
            });
        }
        catch (error) {
            this.log('error', 'Error pausing playback:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * GET /api/playback/status
     * Get current playback status
     */
    handleGetPlaybackStatus(_req, res) {
        try {
            res.json({
                success: true,
                data: {
                    status: this.appState.playbackStatus,
                    position: this.appState.playbackPosition,
                    tracksLoaded: this.appState.loadedTracks.length
                }
            });
        }
        catch (error) {
            this.log('error', 'Error getting playback status:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.RemoteControlService = RemoteControlService;
// Export for backward compatibility
function createRemoteControlService(getMainWindow, port, config) {
    return new RemoteControlService(getMainWindow, port, config);
}
// Singleton instance for backward compatibility with function-based API
let defaultInstance = null;
// Export function-based API for backward compatibility
function initialize(getMainWindow) {
    if (!defaultInstance) {
        defaultInstance = new RemoteControlService(getMainWindow);
    }
}
async function start(port) {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized. Call initialize() first.');
    }
    return defaultInstance.start(port);
}
async function stop() {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized.');
    }
    return defaultInstance.stop();
}
function getUrl() {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized.');
    }
    // Access the private method through the proper API
    const port = defaultInstance.port;
    const ipAddress = defaultInstance.getLocalIPAddress();
    return {
        local: `http://localhost:${port}`,
        network: `http://${ipAddress}:${port}`,
        mobile: `http://${ipAddress}:${port}/mobile-control.html`
    };
}
function updateState(updates) {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized.');
    }
    defaultInstance.updateState(updates);
}
function getState() {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized.');
    }
    return defaultInstance.getState();
}
function setSetlistDirectory(directory) {
    if (!defaultInstance) {
        throw new Error('Remote control service not initialized.');
    }
    defaultInstance.setSetlistDirectory(directory);
}
