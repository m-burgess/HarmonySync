"use strict";
/**
 * HTTP Server Service
 * Provides HTTP endpoints for serving video and image files with streaming support
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
exports.HTTPServerService = void 0;
exports.createHTTPServerService = createHTTPServerService;
exports.start = start;
exports.stop = stop;
exports.getUrl = getUrl;
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cors_1 = __importDefault(require("cors"));
const services_1 = require("../types/services");
/**
 * HTTP Server Service Implementation
 * Serves media files (videos and images) via HTTP with streaming support
 */
class HTTPServerService extends services_1.BaseElectronService {
    constructor(port = 8765, config) {
        super(config);
        this.serviceName = 'HTTPServerService';
        this.server = null;
        this.app = null;
        this.port = port;
    }
    /**
     * Initialize the HTTP server service
     */
    async onInitialize() {
        this.log('info', 'HTTP server service ready');
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
        this.log('info', 'HTTP server service disposed');
    }
    /**
     * Start the HTTP server
     * @param port - Optional port override
     */
    async start(port) {
        const serverPort = port || this.port;
        if (this.server) {
            this.log('warn', 'HTTP server already running');
            return;
        }
        this.app = (0, express_1.default)();
        this.app.use((0, cors_1.default)());
        // Setup routes
        this.setupVideoRoute();
        this.setupImageRoute();
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(serverPort, '127.0.0.1', (err) => {
                    if (err) {
                        this.log('error', 'Failed to start HTTP server:', err);
                        reject(err);
                    }
                    else {
                        this.log('info', `HTTP server listening on http://127.0.0.1:${serverPort}`);
                        this.emit('started', { port: serverPort });
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
     * Stop the HTTP server
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.log('info', 'HTTP server stopped');
                    this.server = null;
                    this.app = null;
                    this.emit('stopped');
                    resolve();
                });
            });
        }
    }
    /**
     * Get the server URL
     */
    async getServerUrl() {
        return `http://127.0.0.1:${this.port}`;
    }
    /**
     * Setup video streaming route
     * Serves video files with proper headers for streaming and range requests
     */
    setupVideoRoute() {
        if (!this.app)
            return;
        this.app.get('/video/*', (req, res) => {
            try {
                const videoPath = decodeURIComponent(req.params[0]);
                if (!fs.existsSync(videoPath)) {
                    this.log('warn', `Video not found: ${videoPath}`);
                    res.status(404).send('Video not found');
                    return;
                }
                const stat = fs.statSync(videoPath);
                const fileSize = stat.size;
                const range = req.headers.range;
                if (range) {
                    // Handle range request for streaming
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunkSize = (end - start) + 1;
                    const file = fs.createReadStream(videoPath, { start, end });
                    const headers = {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunkSize,
                        'Content-Type': 'video/mp4',
                    };
                    res.writeHead(206, headers);
                    file.pipe(res);
                }
                else {
                    // Full file request
                    const headers = {
                        'Content-Length': fileSize,
                        'Content-Type': 'video/mp4',
                    };
                    res.writeHead(200, headers);
                    fs.createReadStream(videoPath).pipe(res);
                }
                this.log('debug', `Served video: ${videoPath}`);
            }
            catch (error) {
                this.log('error', 'Error serving video:', error);
                res.status(500).send('Internal server error');
            }
        });
    }
    /**
     * Setup image serving route
     * Serves image files with proper content types
     */
    setupImageRoute() {
        if (!this.app)
            return;
        this.app.get('/image/*', (req, res) => {
            try {
                const imagePath = decodeURIComponent(req.params[0]);
                if (!fs.existsSync(imagePath)) {
                    this.log('warn', `Image not found: ${imagePath}`);
                    res.status(404).send('Image not found');
                    return;
                }
                const ext = path.extname(imagePath).toLowerCase();
                const contentTypeMap = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                };
                const contentType = contentTypeMap[ext] || 'image/png';
                res.setHeader('Content-Type', contentType);
                fs.createReadStream(imagePath).pipe(res);
                this.log('debug', `Served image: ${imagePath}`);
            }
            catch (error) {
                this.log('error', 'Error serving image:', error);
                res.status(500).send('Internal server error');
            }
        });
    }
}
exports.HTTPServerService = HTTPServerService;
// Export for backward compatibility
function createHTTPServerService(port, config) {
    return new HTTPServerService(port, config);
}
// Create singleton instance for backward compatibility with function-based API
const defaultInstance = new HTTPServerService();
// Export function-based API for backward compatibility
async function start(port) {
    return defaultInstance.start(port);
}
async function stop() {
    return defaultInstance.stop();
}
async function getUrl() {
    return defaultInstance.getServerUrl();
}
