import { app, mixer } from '../server';

describe('Server songs endpoints', () => {
  let server: any;
  let baseUrl: string;

  beforeAll((done) => {
    // ensure clean state
    mixer.tracks.clear();
    mixer.songs.clear();
    server = app.listen(0, () => {
      // @ts-ignore
      const port = (server.address() && server.address().port) || 3001;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) server.close(done); else done();
  });

  beforeEach(() => {
    mixer.tracks.clear();
    mixer.songs.clear();
    mixer.currentSongId = null;
  });

  test('POST /api/songs/create returns 400 when missing fields', async () => {
    const res = await fetch(`${baseUrl}/api/songs/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/name/);
  });

  test('POST /api/songs/create returns songId on success', async () => {
    const spy = jest.spyOn(mixer as any, 'createSong').mockResolvedValue('song-123');
    const res = await fetch(`${baseUrl}/api/songs/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'MySong', trackPaths: ['/tmp/a.wav'] }) });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.songId).toBe('song-123');
    spy.mockRestore();
  });

  test('POST /api/songs/:songId/play returns 500 when song not found', async () => {
    const res = await fetch(`${baseUrl}/api/songs/nonexistent/play`, { method: 'POST' });
    expect(res.status).toBe(500);
    const body = await res.json() as any;
    expect(body.error).toBeDefined();
  });

  test('POST /api/songs/:songId/stop returns false when song not found', async () => {
    const res = await fetch(`${baseUrl}/api/songs/nonexistent/stop`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  test('DELETE /api/songs/:songId returns false when song not found', async () => {
    const res = await fetch(`${baseUrl}/api/songs/nonexistent`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  test('GET /api/songs returns songs list and GET /api/songs/:id returns song', async () => {
    // create a fake track and song in mixer
    const fakeTrack: any = { id: 't1', name: 'T1', isPlaying: false, volume: 1, pan: 0, isMuted: false, getState() { return { id: this.id, name: this.name, isPlaying: this.isPlaying, volume: this.volume, pan: this.pan, isMuted: this.isMuted }; } };
    mixer.tracks.set(fakeTrack.id, fakeTrack);
    const song = { id: 's1', name: 'S1', trackIds: [fakeTrack.id], isPlaying: false } as any;
    mixer.songs.set(song.id, song);

    let res = await fetch(`${baseUrl}/api/songs`);
    expect(res.status).toBe(200);
    let body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.songs)).toBe(true);
    expect(body.songs.some((s: any) => s && s.id === 's1')).toBe(true);

    res = await fetch(`${baseUrl}/api/songs/s1`);
    expect(res.status).toBe(200);
    body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.song.id).toBe('s1');

    res = await fetch(`${baseUrl}/api/songs/notfound`);
    expect(res.status).toBe(404);
  });
});
