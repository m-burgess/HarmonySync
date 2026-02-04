/// <reference types="jest" />
import request from 'supertest';

let app: any;
let server: any;
let ioServer: any;
let serverModule: any;

beforeAll(async () => {
  // Prevent process.exit from terminating the test runner
  (process as any).exit = jest.fn();
  process.env.PORT = '3100';
  process.env.HOST = '127.0.0.1';
  process.env.SHUTDOWN_TOKEN = 'testtoken';

  const mod = await import('../../../harmonysync-image-service/server.ts');
  app = mod.app;
  server = mod.server;
  ioServer = mod.io;
  serverModule = mod;
});

afterAll((done) => {
  if (ioServer && typeof ioServer.close === 'function') {
    try { ioServer.close(); } catch (e) {}
  }
  try { serverModule?.clearAllJobCleanupTimers?.(); } catch (e) {}

  if (server && typeof server.close === 'function') {
    server.close(() => done());
    return;
  }
  done();
});

test('GET /api/health returns service info', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('service', 'harmonysync-image-service');
  expect(res.body).toHaveProperty('activeJobs');
});

test('POST /api/shutdown rejects invalid token', async () => {
  const res = await request(app).post('/api/shutdown').set('x-shutdown-token', 'wrong');
  expect(res.status).toBe(403);
});

test('POST /api/shutdown accepts valid token and responds', async () => {
  const res = await request(app).post('/api/shutdown').set('x-shutdown-token', 'testtoken');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message');
});

test('GET /api/jobs/:id returns job JSON', async () => {
  // create a job directly in the server's jobs map
  const id = 'test-job-1';
  const job = new serverModule.ImageJob(id, 'resize', 'img.jpg', { width: 10 });
  serverModule.jobs.set(id, job);

  const res = await request(app).get(`/api/jobs/${id}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id', id);

  // cleanup
  serverModule.jobs.delete(id);
});

test('DELETE /api/jobs/:id cancels job and returns cancelled job', async () => {
  const id = 'test-job-2';
  const job = new serverModule.ImageJob(id, 'resize', 'img.jpg', { width: 20 });
  serverModule.jobs.set(id, job);

  const res = await request(app).delete(`/api/jobs/${id}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message', 'Job cancelled');
  expect(res.body.job).toHaveProperty('status', 'cancelled');

  const stored = serverModule.jobs.get(id);
  expect(stored).toBeDefined();
  expect(stored.status).toBe('cancelled');

  serverModule.jobs.delete(id);
});

test('GET /api/queue returns queue status and entries', async () => {
  // push jobs into the queue
  const j1 = new serverModule.ImageJob('q1', 'resize', 'a.jpg', { width: 5 });
  const j2 = new serverModule.ImageJob('q2', 'convert', 'b.jpg', { format: 'png' });
  serverModule.jobQueue.push(j1, j2);

  const res = await request(app).get('/api/queue');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('activeJobs');
  expect(res.body).toHaveProperty('queuedJobs');
  expect(res.body).toHaveProperty('queue');
  expect(Array.isArray(res.body.queue)).toBe(true);

  // cleanup
  serverModule.jobQueue.length = 0;
});

test('POST /api/shutdown accepts Bearer token in Authorization header', async () => {
  const res = await request(app).post('/api/shutdown').set('Authorization', 'Bearer testtoken');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message');
});
