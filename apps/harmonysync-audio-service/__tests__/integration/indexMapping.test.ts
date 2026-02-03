import { app, mixer, AudioTrack } from '../../server';

describe('Index-based endpoints compatibility', () => {
  let server: any;
  let baseUrl: string;

  beforeAll((done) => {
    // Clear any existing tracks
    mixer.tracks.clear();

    // Add three tracks in specific order
    const t1 = new AudioTrack('t1', 'Kick', '/tmp/kick.wav', 5, 2, 44100);
    const t2 = new AudioTrack('t2', 'Bass', '/tmp/bass.wav', 5, 2, 44100);
    const t3 = new AudioTrack('t3', 'Guitar', '/tmp/guitar.wav', 5, 2, 44100);

    mixer.tracks.set(t1.id, t1);
    mixer.tracks.set(t2.id, t2);
    mixer.tracks.set(t3.id, t3);

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

  test('POST /api/tracks/mute maps trackIndex -> trackId', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIndex: 1, muted: true })
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('success', true);

    // Ensure the second track (index 1) was muted
    const track = Array.from(mixer.tracks.values())[1];
    expect(track.id).toBe('t2');
    expect(track.isMuted).toBe(true);
  });

  test('POST /api/tracks/volume maps trackIndex -> trackId', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIndex: 0, volume: 0.25 })
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('success', true);

    const track = Array.from(mixer.tracks.values())[0];
    expect(track.id).toBe('t1');
    expect(track.volume).toBeCloseTo(0.25);
  });

  test('POST /api/tracks/pan maps trackIndex -> trackId', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/pan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIndex: 2, pan: -1 })
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('success', true);

    const track = Array.from(mixer.tracks.values())[2];
    expect(track.id).toBe('t3');
    expect(track.pan).toBe(-1);
  });
});
