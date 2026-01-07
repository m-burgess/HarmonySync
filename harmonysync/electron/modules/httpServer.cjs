const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

/**
 * HTTP Server Module
 * Serves media files (videos, images) over HTTP
 */

let server = null;
let app = null;
let port = 8080;

/**
 * Start HTTP server
 * @param {number} serverPort - Port to listen on (default: 8080)
 * @returns {Promise<object>} Server info
 */
async function start(serverPort = 8080) {
  try {
    if (server) {
      return {
        success: true,
        port: port,
        message: 'HTTP server already running'
      };
    }

    port = serverPort;
    app = express();

    // Enable CORS
    app.use(cors());

    // Serve static files from various locations
    app.use('/media', (req, res, next) => {
      // Decode the file path from URL
      const filePath = decodeURIComponent(req.path.substring(1));
      
      if (fs.existsSync(filePath)) {
        // Set appropriate headers for media streaming
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          // Handle range requests for video streaming
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(filePath, { start, end });
          const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': getContentType(filePath),
          };
          res.writeHead(206, head);
          file.pipe(res);
        } else {
          // Serve full file
          const head = {
            'Content-Length': fileSize,
            'Content-Type': getContentType(filePath),
          };
          res.writeHead(200, head);
          fs.createReadStream(filePath).pipe(res);
        }
      } else {
        res.status(404).send('File not found');
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', port: port });
    });

    return new Promise((resolve, reject) => {
      server = app.listen(port, '0.0.0.0', () => {
        console.log(`HTTP media server listening on port ${port}`);
        resolve({
          success: true,
          port: port,
          message: `HTTP server started on port ${port}`
        });
      });

      server.on('error', (error) => {
        console.error('HTTP server error:', error);
        server = null;
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error starting HTTP server:', error);
    throw error;
  }
}

/**
 * Stop HTTP server
 * @returns {Promise<object>} Stop status
 */
async function stop() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('HTTP media server stopped');
        server = null;
        app = null;
        resolve({
          success: true,
          message: 'HTTP server stopped'
        });
      });
    } else {
      resolve({
        success: true,
        message: 'HTTP server was not running'
      });
    }
  });
}

/**
 * Get content type for file
 * @param {string} filePath - File path
 * @returns {string} Content type
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.ogv': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };
  return types[ext] || 'application/octet-stream';
}

module.exports = {
  start,
  stop
};
