import { AddressInfo } from 'net';
import { io as Client, Socket } from 'socket.io-client';
import { server } from '../server';

// Use shared manual mock for fluent-ffmpeg
jest.mock('fluent-ffmpeg');

describe('Socket.io events', () => {
  let listener: any;
  let socket: Socket;

  beforeAll((done) => {
    listener = server.listen(0, '127.0.0.1', () => done());
  });

  afterAll((done) => {
    if (socket && socket.connected) socket.close();
    listener.close(() => done());
  });

  it('emits job:created and job:complete for video:metadata', async () => {
    const addr = listener.address() as AddressInfo;
    const port = addr.port;

    socket = Client(`http://127.0.0.1:${port}`);

    const created = new Promise<any>((resolve) => socket.once('job:created', resolve));
    const complete = new Promise<any>((resolve) => socket.once('job:complete', resolve));

    // send metadata request
    socket.emit('video:metadata', { inputPath: '/tmp/fake.mp4' });

    const jobCreated = await created;
    expect(jobCreated).toHaveProperty('id');
    expect(jobCreated).toHaveProperty('type', 'metadata');

    const jobComplete = await complete;
    expect(jobComplete).toHaveProperty('status', 'completed');
    expect(jobComplete).toHaveProperty('result');
    expect(jobComplete.result).toHaveProperty('duration');
  });
});
