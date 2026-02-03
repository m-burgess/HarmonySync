import { AudioMixer, AudioTrack } from '../server';

describe('AudioMixer behaviours', () => {
  test('setMasterVolume clamps to 0..2', () => {
    const m = new AudioMixer();
    m.setMasterVolume(-1);
    expect(m.masterVolume).toBe(0);
    m.setMasterVolume(3);
    expect(m.masterVolume).toBe(2);
    m.setMasterVolume(1.2);
    expect(m.masterVolume).toBeCloseTo(1.2);
  });

  test('setCrossfadeDuration clamps to defined bounds', () => {
    const m = new AudioMixer();
    m.setCrossfadeDuration(50);
    expect(m.crossfadeDuration).toBe(100);
    m.setCrossfadeDuration(20000);
    expect(m.crossfadeDuration).toBe(10000);
    m.setCrossfadeDuration(500);
    expect(m.crossfadeDuration).toBe(500);
  });

  test('applyDefaultPanning applies left for click/guide and right for others when present', () => {
    const m = new AudioMixer();
    const click = new AudioTrack('t1', 'Click Track', '/tmp/click.wav', 5, 2, 44100);
    const guitar = new AudioTrack('t2', 'Guitar', '/tmp/g.wav', 8, 2, 44100);
    const vocal = new AudioTrack('t3', 'Vocal', '/tmp/v.wav', 6, 2, 44100);

    m.tracks.set(click.id, click);
    m.tracks.set(guitar.id, guitar);
    m.tracks.set(vocal.id, vocal);

    // Before applying, pans default to 0
    expect(click.pan).toBe(0);
    expect(guitar.pan).toBe(0);

    m.applyDefaultPanning();

    expect(m.tracks.get(click.id)?.pan).toBe(-1);
    expect(m.tracks.get(guitar.id)?.pan).toBe(1);
    expect(m.tracks.get(vocal.id)?.pan).toBe(1);
  });

  test('applyDefaultPanningToTrack respects existing click presence', () => {
    const m = new AudioMixer();
    const guide = new AudioTrack('x1', 'Guide', '/tmp/g.wav', 5, 2, 44100);
    const bass = new AudioTrack('x2', 'Bass', '/tmp/b.wav', 5, 2, 44100);

    m.tracks.set(guide.id, guide);
    m.tracks.set(bass.id, bass);

    // New track to apply to
    const newTrack = new AudioTrack('x3', 'Piano', '/tmp/p.wav', 5, 2, 44100);

    // When we call applyDefaultPanningToTrack, it should detect guide and set pan accordingly
    m.applyDefaultPanningToTrack(newTrack);
    // Since there is a guide in mixer.tracks, piano should be panned to right (1)
    expect(newTrack.pan).toBe(1);
  });

  test('getMemoryUsage returns numeric fields', () => {
    const m = new AudioMixer();
    const mem = m.getMemoryUsage();
    expect(typeof mem.rss).toBe('number');
    expect(typeof mem.heapUsed).toBe('number');
    expect(typeof mem.arrayBuffers).toBe('number');
  });
});
