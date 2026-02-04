import { app, mixer } from '../../../../harmonysync-audio-service/server';

describe('Server REST error branches', () => {
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

  test('POST /api/tracks/mute returns 400 when trackIndex missing', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/mute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/tracks/mute returns 404 when trackIndex out of range', async () => {
    // no tracks loaded, index 5 should be not found
    const res = await fetch(`${baseUrl}/api/tracks/mute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackIndex: 5, muted: true }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/mixer/crossfade returns 400 when trackPaths missing', async () => {
    const res = await fetch(`${baseUrl}/api/mixer/crossfade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/mixer/crossfade returns 500 when mixer.crossfadeToNewTracks throws', async () => {
    const spy = jest.spyOn(mixer as any, 'crossfadeToNewTracks').mockImplementation(async () => { throw new Error('boom'); });
    const res = await fetch(`${baseUrl}/api/mixer/crossfade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackPaths: ['/tmp/a.wav'] }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'boom');
    spy.mockRestore();
  });

  test('DELETE /api/tracks/:trackId returns 404 for missing track', async () => {
    const res = await fetch(`${baseUrl}/api/tracks/nonexistent`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
