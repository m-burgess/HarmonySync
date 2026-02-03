import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { app } from '../server';

describe('Playback endpoints', () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = path.join(os.tmpdir(), `hs-video-test-${Date.now()}.mp4`);
    // create a small dummy file
    fs.writeFileSync(tmpFile, Buffer.alloc(1024));
  });

  afterAll(() => {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
  });

  it('POST /api/play starts playback and returns id and streamUrl', async () => {
    const res = await request(app)
      .post('/api/play')
      .send({ inputPath: tmpFile, loop: false })
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('streamUrl');

    const id = res.body.id as string;

    // GET stream without Range
    const streamRes = await request(app).get(`/stream/${id}`).expect(200);
    expect(streamRes.headers['content-type']).toMatch(/video/);

    // GET stream with Range header
    const rangeRes = await request(app)
      .get(`/stream/${id}`)
      .set('Range', 'bytes=0-9')
      .expect(206);

    expect(rangeRes.headers['content-range']).toBeDefined();

    // Stop playback
    const stopRes = await request(app).post('/api/stop').send({ id }).expect(200);
    expect(stopRes.body).toHaveProperty('message', 'Stopped');

    // now-playing should show not playing
    const now = await request(app).get('/api/now-playing').expect(200);
    expect(now.body.playing).toBe(false);
  });
});
