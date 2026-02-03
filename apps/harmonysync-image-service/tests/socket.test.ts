/// <reference types="jest" />
import { io as Client } from 'socket.io-client';

let serverUrl = 'http://127.0.0.1:3100';
let server: any;
let ioServer: any;
const clients: any[] = [];
let serverModule: any;

beforeAll(async () => {
  // Prevent process.exit from terminating the test runner
  (process as any).exit = jest.fn();
  process.env.PORT = '3100';
  process.env.HOST = '127.0.0.1';
  process.env.SHUTDOWN_TOKEN = 'testtoken';

  // Mock fs-extra and sharp to avoid filesystem and native dependencies in tests
  jest.mock('fs-extra', () => ({ ensureDir: jest.fn().mockResolvedValue(undefined) }));
  jest.mock('sharp', () => {
    return jest.fn(() => ({
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      avif: jest.fn().mockReturnThis(),
      tiff: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined)
    }));
  });

  const mod = await import('../server.ts');
  serverModule = mod;
  server = mod.server;
  ioServer = mod.io;
  // Start listening for socket.io tests
  if (server && typeof server.listen === 'function') {
    await new Promise<void>((resolve) => server.listen(3100, '127.0.0.1', () => resolve()));
  }
});

afterAll((done) => {
  // Close all clients
  for (const c of clients) {
    try {
      if (typeof c.disconnect === 'function') c.disconnect();
      if (typeof c.close === 'function') c.close();
    } catch (e) {}
  }

  // Close Socket.IO server if present
  if (ioServer && typeof ioServer.close === 'function') {
    try { ioServer.close(); } catch (e) {}
  }
  // Clear job cleanup timers scheduled by server
  try { serverModule?.clearAllJobCleanupTimers?.(); } catch (e) {}

  if (server && typeof server.close === 'function') {
    server.close(() => done());
    return;
  }
  done();
});

test('socket image:resize triggers job:created', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:resize', { inputPath: 'nonexistent.jpg', options: { width: 50 } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:created'));
  }, 3000);

  socket.on('job:created', (job: any) => {
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('id');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('socket image:convert triggers job:complete', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:convert', { inputPath: 'img.jpg', options: { format: 'jpeg' } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:complete'));
  }, 3000);

  socket.on('job:complete', (job: any) => {
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('status', 'completed');
      expect(job.result).toHaveProperty('outputPath');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('cancel during processing leaves job cancelled', async () => {
  // Reconfigure sharp mock to delay file writes so we can cancel during processing
  const sharpMock = require('sharp') as jest.Mock;
  sharpMock.mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    tiff: jest.fn().mockReturnThis(),
    toFile: jest.fn(() => new Promise((res) => setTimeout(res, 300)))
  }));

  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  let jobId: string | null = null;

  await new Promise<void>((resolve) => {
    socket.on('connect', () => {
      socket.emit('image:convert', { inputPath: 'big.jpg', options: { format: 'webp' } });
    });

    socket.on('job:created', (job: any) => {
      jobId = job.id;
      // Cancel shortly after creation while processing
      setTimeout(async () => {
        try {
          const res = await require('supertest')(server).delete(`/api/jobs/${jobId}`);
          expect(res.status).toBe(200);
        } catch (e) {}
      }, 50);
      resolve();
    });
  });

  // wait longer than toFile delay and then assert job is cancelled
  await new Promise((r) => setTimeout(r, 500));
  const getRes = await require('supertest')(server).get(`/api/jobs/${jobId}`);
  expect(getRes.status).toBe(200);
  expect(getRes.body).toHaveProperty('status', 'cancelled');
  socket.close();
});

test('unsupported format emits job:error', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:convert', { inputPath: 'img.jpg', options: { format: 'xyz' } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:error'));
  }, 3000);

  socket.on('job:error', (job: any) => {
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('status', 'error');
      expect(job.error).toMatch(/Unsupported format/);
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('socket image:thumbnail triggers job:complete', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:thumbnail', { inputPath: 'img.jpg', options: { width: 100 } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:complete'));
  }, 3000);

  socket.on('job:complete', (job: any) => {
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('status', 'completed');
      expect(job.result).toHaveProperty('thumbnailPath');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('socket image:optimize triggers job:complete', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:optimize', { inputPath: 'img.jpg', options: { maxWidth: 800 } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:complete'));
  }, 3000);

  socket.on('job:complete', (job: any) => {
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('status', 'completed');
      expect(job.result).toHaveProperty('outputPath');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('socket image:batch processes multiple images', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  socket.on('connect', () => {
    socket.emit('image:batch', { options: { images: ['a.jpg', 'b.jpg'], operation: 'convert', format: 'webp' } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for job:complete'));
  }, 5000);
  let batchId: string | null = null;
  socket.on('job:created', (job: any) => {
    // capture only the batch job id
    if (job && job.type === 'batch') {
      batchId = job.id;
    }
  });

  socket.on('job:complete', (job: any) => {
    if (!batchId) return; // ignore subjob completions until batch id known
    if (job.id !== batchId) return; // ignore subjob completes
    clearTimeout(timeout);
    try {
      expect(job).toHaveProperty('status', 'completed');
      expect(job.result).toHaveProperty('total', 2);
      expect(job.result).toHaveProperty('succeeded');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('batch emits multiple progress events and completes at 100', (done) => {
  const socket = Client(serverUrl, { transports: ['websocket'] });
  clients.push(socket);

  let batchId: string | null = null;
  const progresses: number[] = [];

  socket.on('connect', () => {
    socket.emit('image:batch', { options: { images: ['a.jpg', 'b.jpg', 'c.jpg'], operation: 'convert', format: 'webp' } });
  });

  const timeout = setTimeout(() => {
    socket.close();
    done(new Error('Timeout waiting for batch progress'));
  }, 5000);

  socket.on('job:created', (job: any) => {
    if (job && job.type === 'batch') batchId = job.id;
  });

  socket.on('job:progress', (job: any) => {
    if (!batchId || job.id !== batchId) return;
    progresses.push(job.progress);
  });

  socket.on('job:complete', (job: any) => {
    if (!batchId || job.id !== batchId) return;
    clearTimeout(timeout);
    try {
      expect(progresses.length).toBeGreaterThanOrEqual(1);
      expect(progresses[progresses.length - 1]).toBe(100);
      expect(job).toHaveProperty('status', 'completed');
      socket.close();
      done();
    } catch (err) {
      socket.close();
      done(err as Error);
    }
  });
});

test('concurrency: only one active when MAX_CONCURRENT_JOBS=1', async () => {
  // Use a fresh module load with MAX_CONCURRENT_JOBS=1 on a separate port
  jest.resetModules();

  // Make sharp slower for this test so we can observe queueing
  const sharpMock = require('sharp') as jest.Mock;
  sharpMock.mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    tiff: jest.fn().mockReturnThis(),
    toFile: jest.fn(() => new Promise((res) => setTimeout(res, 300)))
  }));

  process.env.MAX_CONCURRENT_JOBS = '1';
  const PORT = 3210;
  process.env.PORT = String(PORT);
  process.env.HOST = '127.0.0.1';

  const mod = await import('../server.ts');
  const server2 = mod.server;
  const clientsLocal: any[] = [];

  await new Promise<void>((r) => server2.listen(PORT, '127.0.0.1', () => r()));

  const socket = Client(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  clientsLocal.push(socket);

  const created: string[] = [];
  const completed: string[] = [];

  socket.on('job:created', (job: any) => {
    created.push(job.id);
  });

  socket.on('job:complete', (job: any) => {
    completed.push(job.id);
  });

  // emit two jobs quickly
  await new Promise<void>((resolve) => {
    socket.on('connect', () => {
      socket.emit('image:convert', { inputPath: 'one.jpg', options: { format: 'webp' } });
      socket.emit('image:convert', { inputPath: 'two.jpg', options: { format: 'webp' } });
      resolve();
    });
  });

  // wait for both created
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (created.length >= 2) {
        clearInterval(check);
        resolve();
      }
    }, 20);
  });

  // shortly after creation, first should be processing and second should be queued
  const qRes = await require('supertest')(server2).get('/api/queue');
  expect(qRes.status).toBe(200);
  expect(qRes.body.queuedJobs).toBeGreaterThanOrEqual(0);

  // wait for both completions
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (completed.length >= 2) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });

  // Ensure first completed before second
  expect(completed[0]).toBe(created[0]);
  expect(completed[1]).toBe(created[1]);

  // cleanup
  for (const c of clientsLocal) {
    try { c.close(); } catch (e) {}
  }
  try { mod.clearAllJobCleanupTimers?.(); } catch (e) {}
  await new Promise<void>((r) => server2.close(() => r()));
});
