/// <reference types="jest" />
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { app, server, parseTimemark, VideoJob, jobs, transcodeVideo } from '../server';
import { io as Client } from 'socket.io-client';

jest.setTimeout(20000);

describe('Additional REST and util tests', () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = path.join(os.tmpdir(), `hs-video-test-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, Buffer.alloc(1024));
  });

  afterAll(() => {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
  });

  test('parseTimemark handles H:M:S, M:S and seconds', () => {
    expect(parseTimemark('00:01:30')).toBeCloseTo(90);
    expect(parseTimemark('2:30')).toBeCloseTo(150);
    expect(parseTimemark('12.5')).toBeCloseTo(12.5);
    expect(parseTimemark(undefined)).toBe(0);
  });

  test('GET /stream/:id returns 404 if job not found', async () => {
    const res = await request(app).get('/stream/nonexistent');
    expect(res.status).toBe(404);
  });

  test('POST /api/play returns 400 when inputPath missing', async () => {
    const res = await request(app).post('/api/play').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/play returns 404 when file missing', async () => {
    const res = await request(app).post('/api/play').send({ inputPath: '/tmp/doesnotexist.mp4' });
    expect(res.status).toBe(404);
  });

  test('playback conflict returns 409 when another is playing', async () => {
    // start a playback
    const res1 = await request(app).post('/api/play').send({ inputPath: tmpFile });
    expect(res1.status).toBe(200);
    const id = res1.body.id as string;

    // immediate second attempt should return 409
    const res2 = await request(app).post('/api/play').send({ inputPath: tmpFile });
    expect(res2.status).toBe(409);

    // stop playback
    await request(app).post('/api/stop').send({ id }).expect(200);
  });

  test('POST /api/stop without playback returns 400', async () => {
    const res = await request(app).post('/api/stop').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/stop with invalid id returns 404', async () => {
    const res = await request(app).post('/api/stop').send({ id: 'nope' });
    expect(res.status).toBe(404);
  });

  test('video:transcode returns completed immediately when output exists', async () => {
    // create input and output files
    const base = `in-${Date.now()}`;
    const input = path.join(os.tmpdir(), `${base}.mp4`);
    const out = path.join(os.tmpdir(), `${base}_transcoded.mp4`);
    fs.writeFileSync(input, Buffer.alloc(512));
    fs.writeFileSync(out, Buffer.alloc(512));

    // Call transcodeVideo directly to exercise early-return when output exists
    const jobId = `job-${Date.now()}`;
    const job = new VideoJob(jobId, 'transcode', input, { force: false });
    jobs.set(jobId, job);

    const result = await transcodeVideo(job, { emit: () => {} } as any);
    expect(result).toBeDefined();
    const stored = jobs.get(jobId);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe('completed');
    jobs.delete(jobId);

    fs.unlinkSync(input);
    fs.unlinkSync(out);
  });

  test('playback completes automatically when duration elapses', async () => {
    // override ffprobe to return short duration
    const ffmpegMock = jest.requireMock('fluent-ffmpeg');
    const originalProbe = ffmpegMock.ffprobe;
    ffmpegMock.ffprobe = (input: string, cb: (err: Error | null, metadata?: any) => void) => {
      const metadata = {
        format: { duration: 1 },
        streams: []
      };
      process.nextTick(() => cb(null, metadata));
    };
    let listener: any;
    let socket: any;
    try {
      listener = await new Promise<any>((resolve) => {
        const l = server.listen(0, '127.0.0.1', () => resolve(l));
      });
      const addr = listener.address() as any;
      const port = addr.port;

      socket = Client(`http://127.0.0.1:${port}`);
      await new Promise<void>((res) => socket.once('connect', () => res()));

      const playRes = await request(app).post('/api/play').send({ inputPath: tmpFile });
      expect(playRes.status).toBe(200);

      const complete = new Promise<any>((resolve) => socket.once('playback:complete', resolve));

      // wait for playback to complete (ffprobe duration 1s)
      const done = await complete;
      expect(done).toHaveProperty('status', 'completed');
    } finally {
      try { if (socket) socket.close(); } catch (e) {}
      try { if (listener) await new Promise<void>((r) => listener.close(() => r())); } catch (e) {}
      ffmpegMock.ffprobe = originalProbe;
    }
  });
});
