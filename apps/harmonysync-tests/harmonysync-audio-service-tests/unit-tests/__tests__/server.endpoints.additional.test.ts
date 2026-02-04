import { app as _appStarter } from '../../../../harmonysync-audio-service/server';

describe('Server endpoint error and compatibility paths', () => {
  let server: any;
  let baseUrl: string;

  beforeAll((done) => {
    jest.resetModules();
    // require server after reset to ensure fresh state
    const srv = require('../server');
    const app = srv.app;
    // start ephemeral server
    server = app.listen(0, () => {
      // @ts-ignore
      const port = (server.address() && server.address().port) || 3001;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) server.close(done); else done();
    jest.restoreAllMocks();
  });

  test('POST /api/tracks/mute returns 400 when trackIndex missing', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/mute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/trackIndex/);
  });

  test('POST /api/tracks/mute returns 404 for out-of-range index', async () => {
    const srv = require('../server');
    const { mixer } = srv;
    mixer.tracks.clear();
    const res = await fetch(`${baseUrl}/api/tracks/mute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackIndex: 5, muted: true }) });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toMatch(/Track not found/);
  });

  test('POST /api/tracks/mute maps index -> trackId and sets mute', async () => {
    const srv = require('../server');
    const { mixer } = srv;
    const fakeTrack: any = {
      id: 'fake-1', name: 'FakeTrack', isMuted: false, isPlaying: false, volume: 1, pan: 0,
      setMute(muted: boolean) { this.isMuted = muted; },
      setVolume(v: number) { this.volume = v; },
      setPan(p: number) { this.pan = p; },
      getState() { return { id: this.id, name: this.name, isPlaying: this.isPlaying, volume: this.volume, pan: this.pan, isMuted: this.isMuted }; },
      stop() { this.isPlaying = false; }
    };
    mixer.tracks.clear();
    mixer.tracks.set(fakeTrack.id, fakeTrack);

    const res = await fetch(`${baseUrl}/api/tracks/mute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackIndex: 0, muted: true }) });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(fakeTrack.isMuted).toBe(true);
  });

  test('POST /api/mixer/crossfade returns 400 when trackPaths missing', async () => {
    const res = await fetch(`${baseUrl}/api/mixer/crossfade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/trackPaths/);
  });

  test('POST /api/mixer/crossfade-duration bounds validation', async () => {
    const srv = require('../server');
    const { mixer } = srv;

    let res = await fetch(`${baseUrl}/api/mixer/crossfade-duration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: 50 }) });
    expect(res.status).toBe(400);

    res = await fetch(`${baseUrl}/api/mixer/crossfade-duration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: 20000 }) });
    expect(res.status).toBe(400);

    res = await fetch(`${baseUrl}/api/mixer/crossfade-duration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: 500 }) });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(mixer.crossfadeDuration).toBe(500);
  });

  test('POST /api/shutdown requires token when configured', async () => {
    // restart module with SHUTDOWN_TOKEN configured
    jest.resetModules();
    process.env.SHUTDOWN_TOKEN = 'topsecret';
    const srv = require('../server');
    const app = srv.app;
    // start temporary server for this test
    const tmpServer = app.listen(0);
    // @ts-ignore
    const port = (tmpServer.address() && tmpServer.address().port) || 3001;
    const url = `http://127.0.0.1:${port}`;

    let res = await fetch(`${url}/api/shutdown`, { method: 'POST' });
    expect(res.status).toBe(401);

    // stub process.exit to avoid killing the test runner and allow shutdown sequence to run
    const exitSpy = jest.spyOn(process as any, 'exit').mockImplementation(() => {});
    const originalSetTimeout = (global as any).setTimeout;
    // run shutdown timers synchronously so they complete during the test
    (global as any).setTimeout = (fn: Function, _ms?: number, ...args: any[]) => { try { fn(...args); } catch (e) {} return 1 as any; };

    res = await fetch(`${url}/api/shutdown`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SHUTDOWN_TOKEN}` } });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('shutting_down');

    // restore globals
    (global as any).setTimeout = originalSetTimeout;
    exitSpy.mockRestore();
    tmpServer.close();
    delete process.env.SHUTDOWN_TOKEN;
  });
});
