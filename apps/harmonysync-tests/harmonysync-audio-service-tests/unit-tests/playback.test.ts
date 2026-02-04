import { AudioMixer, AudioTrack } from '../../../harmonysync-audio-service/server';

describe('Playback control and song management', () => {
  test('playSong selects master clock when click track is present', () => {
    const m = new AudioMixer();
    const click = new AudioTrack('c1', 'Click Track', '/tmp/c.wav', 5, 2, 44100);
    const guitar = new AudioTrack('g1', 'Guitar', '/tmp/g.wav', 5, 2, 44100);
    m.tracks.set(click.id, click);
    m.tracks.set(guitar.id, guitar);

    const songId = 's1';
    m.songs.set(songId, { id: songId, name: 'Song1', trackIds: [click.id, guitar.id], isPlaying: false });

    (m as any).startMasterClockPlayback = jest.fn();
    (m as any).startSynchronizedSimultaneousPlayback = jest.fn();

    m.playSong(songId);

    expect((m as any).startMasterClockPlayback).toHaveBeenCalled();
    expect((m as any).startSynchronizedSimultaneousPlayback).not.toHaveBeenCalled();
  });

  test('playSong selects synchronized playback when no click track exists', () => {
    const m = new AudioMixer();
    const a = new AudioTrack('a1', 'Guitar', '/tmp/g.wav', 5, 2, 44100);
    const b = new AudioTrack('b1', 'Vocal', '/tmp/v.wav', 5, 2, 44100);
    m.tracks.set(a.id, a);
    m.tracks.set(b.id, b);

    const songId = 's2';
    m.songs.set(songId, { id: songId, name: 'Song2', trackIds: [a.id, b.id], isPlaying: false });

    (m as any).startMasterClockPlayback = jest.fn();
    (m as any).startSynchronizedSimultaneousPlayback = jest.fn();

    m.playSong(songId);

    expect((m as any).startSynchronizedSimultaneousPlayback).toHaveBeenCalled();
    expect((m as any).startMasterClockPlayback).not.toHaveBeenCalled();
  });

  test('setTrackVolume/pan/mute return correct booleans and apply to tracks', () => {
    const m = new AudioMixer();
    const t = new AudioTrack('x1', 'TrackX', '/tmp/x.wav', 4, 2, 44100);
    m.tracks.set(t.id, t);

    expect(m.setTrackVolume(t.id, 0.8)).toBe(true);
    expect(t.volume).toBeCloseTo(0.8);

    expect(m.setTrackPan(t.id, -0.5)).toBe(true);
    expect(t.pan).toBeCloseTo(-0.5);

    expect(m.setTrackMute(t.id, true)).toBe(true);
    expect(t.isMuted).toBe(true);

    expect(m.setTrackVolume('nope', 1)).toBe(false);
  });

  test('createSong loads tracks via loadTrack and sets currentSongId', async () => {
    const m = new AudioMixer();
    // Stub loadTrack to return generated ids
    (m as any).loadTrack = jest.fn(async (path: string) => {
      return `id_${path}`;
    });

    const songId = await m.createSong('MySong', ['p1.wav', 'p2.wav']);
    expect(typeof songId).toBe('string');
    const song = m.songs.get(songId);
    expect(song).toBeDefined();
    expect(song?.trackIds.length).toBeGreaterThanOrEqual(0);
    expect(m.currentSongId).toBe(songId);
  });
});
