import { AddressInfo } from 'net';
import { io as Client, Socket } from 'socket.io-client';
import { server } from '../server';

// Use shared mock by default
jest.mock('fluent-ffmpeg');

describe('Additional Socket.io tests', () => {
  let listener: any;
  let socket: Socket;

  beforeAll(async () => {
    listener = await new Promise<any>((resolve) => {
      const l = server.listen(0, '127.0.0.1', () => resolve(l));
    });
  });

  afterAll(async () => {
    if (socket && socket.connected) socket.close();
    if (listener) await new Promise<void>((resolve) => listener.close(() => resolve()));
  });

  afterEach(() => {
    if (socket && socket.connected) socket.close();
    socket = undefined as unknown as Socket;
  });

  it('transcode emits job:progress before complete', async () => {
    const addr = listener.address() as AddressInfo;
    const port = addr.port;
    socket = Client(`http://127.0.0.1:${port}`);

    const created = new Promise<any>((resolve) => socket.once('job:created', resolve));
    const progress = new Promise<any>((resolve) => socket.once('job:progress', resolve));
    const complete = new Promise<any>((resolve) => socket.once('job:complete', resolve));

    socket.emit('video:transcode', { inputPath: '/tmp/input.mp4', options: { force: true } });

    const jobCreated = await created;
    expect(jobCreated.type).toBe('transcode');

    const prog = await progress;
    expect(prog).toHaveProperty('progress');
    expect(prog.progress).toBeGreaterThan(0);

    const doneJob = await complete;
    expect(doneJob.status).toBe('completed');
  });

  it('handles multiple metadata jobs concurrently', async () => {
    const addr = listener.address() as AddressInfo;
    const port = addr.port;
    socket = Client(`http://127.0.0.1:${port}`);

    const createdPromises: Array<Promise<any>> = [];
    const completePromises: Array<Promise<any>> = [];

    for (let i = 0; i < 2; i++) {
      createdPromises.push(new Promise<any>((resolve) => socket.once('job:created', resolve)));
      completePromises.push(new Promise<any>((resolve) => socket.once('job:complete', resolve)));
      socket.emit('video:metadata', { inputPath: `/tmp/file${i}.mp4` });
    }

    const created = await Promise.all(createdPromises);
    expect(created.length).toBe(2);

    const completes = await Promise.all(completePromises);
    expect(completes.length).toBe(2);
    completes.forEach(c => expect(c.status).toBe('completed'));
  });

  it('emits job:error when ffprobe fails', async () => {
    const addr = listener.address() as AddressInfo;
    const port = addr.port;
    socket = Client(`http://127.0.0.1:${port}`);

    // Override the ffprobe mock to return an error for this test
    const ffmpegMock = jest.requireMock('fluent-ffmpeg');
    const original = ffmpegMock.ffprobe;
    ffmpegMock.ffprobe = (input: string, cb: (err: Error | null, metadata?: any) => void) => {
      process.nextTick(() => cb(new Error('probe failed')));
    };

    const created = new Promise<any>((resolve) => socket.once('job:created', resolve));
    const errorEvent = new Promise<any>((resolve) => socket.once('job:error', resolve));

    socket.emit('video:metadata', { inputPath: '/tmp/bad.mp4' });

    const jobCreated = await created;
    expect(jobCreated.type).toBe('metadata');

    const err = await errorEvent;
    expect(err).toHaveProperty('status', 'error');
    expect(err).toHaveProperty('error');

    // restore
    ffmpegMock.ffprobe = original;
  });
});
