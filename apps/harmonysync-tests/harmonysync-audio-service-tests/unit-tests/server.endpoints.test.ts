import { app, mixer } from '../../../harmonysync-audio-service/server';
import { MockAudioTrack } from '../../mocks/audio-service';

describe('Server REST endpoints', () => {
  let server: any;
  let baseUrl: string;

  beforeAll((done) => {
    mixer.tracks.clear();
    server = app.listen(0, () => {
      // @ts-ignore
      const port = (server.address() && server.address().port) || 3001;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('GET /api/health returns healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('status', 'healthy');
  });

  test('POST /api/tracks/load validates body and loads track via mixer', async () => {
    // missing filePath -> 400
    let res = await fetch(`${baseUrl}/api/tracks/load`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);

    // mock mixer.loadTrack
    const spy = jest.spyOn(mixer as any, 'loadTrack').mockImplementation(async (...args: any[]) => {
      const filePath = args[0] as string;
      const name = args[1] as string | undefined;
      const t = new MockAudioTrack('srv1', name || 'srv', filePath, 1, 2, 44100);
      mixer.tracks.set(t.id, t as any);
      return t.id;
    });

    res = await fetch(`${baseUrl}/api/tracks/load`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath: '/tmp/x.wav', name: 'X' }) });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('trackId');
    expect(mixer.tracks.has(body.trackId)).toBe(true);
    spy.mockRestore();
  });

  test('track volume and delete endpoints work', async () => {
    // ensure a track exists
    const t = new MockAudioTrack('tv1', 'VolTrack', '/tmp/v.wav', 1, 2, 44100);
    mixer.tracks.set(t.id, t as any);

    let res = await fetch(`${baseUrl}/api/tracks/${t.id}/volume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ volume: 0.33 }) });
    expect(res.status).toBe(200);
    expect(t.volume).toBeCloseTo(0.33);

    res = await fetch(`${baseUrl}/api/tracks/${t.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(mixer.tracks.has(t.id)).toBe(false);
  });

  test('master-volume endpoint sets masterVolume', async () => {
    const res = await fetch(`${baseUrl}/api/mixer/master-volume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ volume: 1.5 }) });
    expect(res.status).toBe(200);
    expect(mixer.masterVolume).toBe(1.5);
  });
});
