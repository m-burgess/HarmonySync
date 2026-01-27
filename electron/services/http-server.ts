/**
 * HTTP Server Service
 * Provides HTTP endpoints for serving video and image files with streaming support
 */

import express, { Application, Request, Response } from 'express';
import { Server } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import cors from 'cors';
import { BaseElectronService, IHTTPServerService, ServiceConfig } from '../types/services';

/**
 * HTTP Server Service Implementation
 * Serves media files (videos and images) via HTTP with streaming support
 */
export class HTTPServerService extends BaseElectronService implements IHTTPServerService {
  protected readonly serviceName = 'HTTPServerService';

  private server: Server | null = null;
  private app: Application | null = null;
  private readonly port: number;

  constructor(port: number = 8765, config?: ServiceConfig) {
    super(config);
    this.port = port;
  }

  /**
   * Initialize the HTTP server service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'HTTP server service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
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
  public async start(port?: number): Promise<void> {
    const serverPort = port || this.port;

    if (this.server) {
      this.log('warn', 'HTTP server already running');
      return;
    }

    this.app = express();
    this.app.use(cors());

    // Setup routes
    this.setupVideoRoute();
    this.setupImageRoute();

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(serverPort, '127.0.0.1', (err?: Error) => {
          if (err) {
            this.log('error', 'Failed to start HTTP server:', err);
            reject(err);
          } else {
            this.log('info', `HTTP server listening on http://127.0.0.1:${serverPort}`);
            this.emit('started', { port: serverPort });
            resolve();
          }
        });
      } catch (error) {
        this.handleError('start', error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
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
  public async getServerUrl(): Promise<string> {
    return `http://127.0.0.1:${this.port}`;
  }

  /**
   * Setup video streaming route
   * Serves video files with proper headers for streaming and range requests
   */
  private setupVideoRoute(): void {
    if (!this.app) return;

    this.app.get('/video/*', (req: Request, res: Response) => {
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
        } else {
          // Full file request
          const headers = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
          };
          
          res.writeHead(200, headers);
          fs.createReadStream(videoPath).pipe(res);
        }

        this.log('debug', `Served video: ${videoPath}`);
      } catch (error) {
        this.log('error', 'Error serving video:', error);
        res.status(500).send('Internal server error');
      }
    });
  }

  /**
   * Setup image serving route
   * Serves image files with proper content types
   */
  private setupImageRoute(): void {
    if (!this.app) return;

    this.app.get('/image/*', (req: Request, res: Response) => {
      try {
        const imagePath = decodeURIComponent(req.params[0]);

        if (!fs.existsSync(imagePath)) {
          this.log('warn', `Image not found: ${imagePath}`);
          res.status(404).send('Image not found');
          return;
        }

        const ext = path.extname(imagePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
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
      } catch (error) {
        this.log('error', 'Error serving image:', error);
        res.status(500).send('Internal server error');
      }
    });
  }
}

// Export for backward compatibility
export function createHTTPServerService(port?: number, config?: ServiceConfig): HTTPServerService {
  return new HTTPServerService(port, config);
}

// Create singleton instance for backward compatibility with function-based API
const defaultInstance = new HTTPServerService();

// Export function-based API for backward compatibility
export async function start(port?: number): Promise<void> {
  return defaultInstance.start(port);
}

export async function stop(): Promise<void> {
  return defaultInstance.stop();
}

export async function getUrl(): Promise<string> {
  return defaultInstance.getServerUrl();
}
