import { AudioTrack } from '../server';

describe('AudioTrack basic behaviours', () => {
  test('setVolume clamps values to 0..2', () => {
    const t = new AudioTrack('id1', 'test', '/tmp/file.wav', 10, 2, 44100);
    t.setVolume(-5);
    expect(t.volume).toBe(0);
    t.setVolume(3.5);
    expect(t.volume).toBe(2);
    t.setVolume(1.5);
    expect(t.volume).toBeCloseTo(1.5);
  });

  test('setPan clamps values to -1..1', () => {
    const t = new AudioTrack('id2', 'panner', '/tmp/x.wav', 5, 2, 44100);
    t.setPan(-3);
    expect(t.pan).toBe(-1);
    t.setPan(2);
    expect(t.pan).toBe(1);
    t.setPan(0.25);
    expect(t.pan).toBeCloseTo(0.25);
  });

  test('setMute updates state without playback', () => {
    const t = new AudioTrack('id3', 'muter', '/tmp/x.wav', 5, 2, 44100);
    expect(t.isMuted).toBe(false);
    t.setMute(true);
    expect(t.isMuted).toBe(true);
    t.setMute(false);
    expect(t.isMuted).toBe(false);
  });

  test('getState returns expected structure', () => {
    const t = new AudioTrack('id4', 'statey', '/tmp/x.wav', 7.2, 1, 22050);
    const s = t.getState();
    expect(s).toMatchObject({
      id: 'id4',
      name: 'statey',
      filePath: '/tmp/x.wav',
      duration: 7.2,
      channels: 1,
      sampleRate: 22050,
      volume: t.volume,
      pan: t.pan,
      isMuted: t.isMuted,
      isPlaying: t.isPlaying,
      currentPosition: t.currentPosition
    });
  });
});
