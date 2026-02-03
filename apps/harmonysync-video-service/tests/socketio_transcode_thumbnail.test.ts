/// <reference types="jest" />
import { AddressInfo } from 'net';
import { io as Client, Socket } from 'socket.io-client';
import { server } from '../server';

// Use shared manual mock for fluent-ffmpeg
jest.mock('fluent-ffmpeg');

describe('Socket.io transcode & thumbnail events', () => {
  let listener: any;
  let socket: Socket;

  beforeAll((done) => {
    listener = server.listen(0, '127.0.0.1', () => done());
  });

  afterAll((done) => {
    if (socket && socket.connected) socket.close();
    listener.close(() => done());
  });

  it('handles video:transcode and emits progress/complete', async () => {
    const addr = listener.address() as AddressInfo;
    const port = addr.port;

    socket = Client(`http://127.0.0.1:${port}`);

    const created = new Promise<any>((resolve) => socket.once('job:created', resolve));
    const complete = new Promise<any>((resolve) => socket.once('job:complete', resolve));

    socket.emit('video:transcode', { inputPath: '/tmp/input.mp4', options: { force: true } });

    const jobCreated = await created;
    expect(jobCreated).toHaveProperty('id');
    expect(jobCreated).toHaveProperty('type', 'transcode');

    const jobComplete = await complete;
    expect(jobComplete).toHaveProperty('status', 'completed');
    expect(jobComplete).toHaveProperty('result');
    expect(jobComplete.result).toHaveProperty('outputPath');
  });

  it('handles video:thumbnail and emits complete', async () => {
    // reuse socket
    const created = new Promise<any>((resolve) => socket.once('job:created', resolve));
    const complete = new Promise<any>((resolve) => socket.once('job:complete', resolve));

    socket.emit('video:thumbnail', { inputPath: '/tmp/input.mp4', options: { timestamp: 1 } });

    const jobCreated = await created;
    expect(jobCreated).toHaveProperty('type', 'thumbnail');

    const jobComplete = await complete;
    expect(jobComplete).toHaveProperty('status', 'completed');
    expect(jobComplete).toHaveProperty('result');
    expect(jobComplete.result).toHaveProperty('thumbnailPath');
  });
});


