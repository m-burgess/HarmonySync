/// <reference types="jest" />
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { app, VideoJob, jobs, extractMetadata, io, transcodeVideo, generateThumbnail } from '../server';

jest.setTimeout(20000);

describe('Stream Range and ffprobe error tests', () => {
  test('GET /stream/:id with Range returns 206 and Content-Range header', async () => {
    const tmpFile = path.join(os.tmpdir(), `hs-video-stream-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, Buffer.alloc(1024));

    const jobId = `job-stream-${Date.now()}`;
    const job = new VideoJob(jobId, 'playback', tmpFile, {});
    jobs.set(jobId, job);

    const res = await request(app)
      .get(`/stream/${jobId}`)
      .set('Range', 'bytes=0-9')
      .expect(206);

    expect(res.headers).toHaveProperty('content-range');
    expect(res.headers['accept-ranges']).toBe('bytes');

    jobs.delete(jobId);
    try { fs.unlinkSync(tmpFile); } catch (e) {}
  });

  test('socket video:metadata emits job:error when ffprobe fails', async () => {
    // ensure a real file exists for stat checks
    const tmpFile = path.join(os.tmpdir(), `hs-video-meta-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, Buffer.alloc(256));

    const originalFlag = (global as any).__FLUENT_FFMPEG_SHOULD_ERROR;
    (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = true;

    try {
      const emitSpy = jest.spyOn(io, 'emit');
      const jobId = `job-meta-${Date.now()}`;
      const job = new VideoJob(jobId, 'metadata', tmpFile);
      jobs.set(jobId, job);

      await expect(extractMetadata(job, io)).rejects.toThrow();

      expect(emitSpy).toHaveBeenCalled();
      const calls = emitSpy.mock.calls.filter(c => c[0] === 'job:error');
      expect(calls.length).toBeGreaterThan(0);
      emitSpy.mockRestore();
    } finally {
      (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = originalFlag;
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  });

  test('transcodeVideo emits job:error when ffprobe fails', async () => {
    const tmpFile = path.join(os.tmpdir(), `hs-video-transcode-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, Buffer.alloc(256));

    const originalFlag = (global as any).__FLUENT_FFMPEG_SHOULD_ERROR;
    (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = true;
    try {
      const emitSpy = jest.spyOn(io, 'emit');
      const jobId = `job-transcode-${Date.now()}`;
      const job = new VideoJob(jobId, 'transcode', tmpFile, {} as any);
      jobs.set(jobId, job);

      await expect(transcodeVideo(job, io)).rejects.toThrow();
      const calls = emitSpy.mock.calls.filter(c => c[0] === 'job:error');
      expect(calls.length).toBeGreaterThan(0);
      emitSpy.mockRestore();
      jobs.delete(jobId);
    } finally {
      (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = originalFlag;
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  });

  test('generateThumbnail emits job:error when screenshots fails', async () => {
    const tmpFile = path.join(os.tmpdir(), `hs-video-thumb-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, Buffer.alloc(256));

    const originalFlag = (global as any).__FLUENT_FFMPEG_SHOULD_ERROR;
    (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = true;
    try {
      const emitSpy = jest.spyOn(io, 'emit');
      const jobId = `job-thumb-${Date.now()}`;
      const job = new VideoJob(jobId, 'thumbnail', tmpFile, {} as any);
      jobs.set(jobId, job);

      await expect(generateThumbnail(job, io)).rejects.toThrow();
      const calls = emitSpy.mock.calls.filter(c => c[0] === 'job:error');
      expect(calls.length).toBeGreaterThan(0);
      emitSpy.mockRestore();
      jobs.delete(jobId);
    } finally {
      (global as any).__FLUENT_FFMPEG_SHOULD_ERROR = originalFlag;
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  });
});
