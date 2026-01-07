const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

let server = null;
let app = null;
const PORT = 8765;

async function start() {
  if (server) {
    console.log('HTTP server already running');
    return;
  }
  
  app = express();
  app.use(cors());
  
  // Serve video files with proper headers for streaming
  app.get('/video/*', (req, res) => {
    const videoPath = decodeURIComponent(req.params[0]);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).send('Video not found');
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
  
  // Serve image files
  app.get('/image/*', (req, res) => {
    const imagePath = decodeURIComponent(req.params[0]);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Image not found');
    }
    
    const ext = path.extname(imagePath).toLowerCase();
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }[ext] || 'image/png';
    
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(imagePath).pipe(res);
  });
  
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, '127.0.0.1', (err) => {
      if (err) {
        console.error('Failed to start HTTP server:', err);
        reject(err);
      } else {
        console.log(`HTTP server listening on http://127.0.0.1:${PORT}`);
        resolve();
      }
    });
  });
}

async function stop() {
  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        console.log('HTTP server stopped');
        server = null;
        app = null;
        resolve();
      });
    });
  }
}

function getUrl() {
  return `http://127.0.0.1:${PORT}`;
}

module.exports = {
  start,
  stop,
  getUrl
};
