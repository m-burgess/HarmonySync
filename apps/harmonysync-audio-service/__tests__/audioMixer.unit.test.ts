import AudioMixer from '../audioMixer';

describe('AudioMixer unit tests', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('setTrackVolume / setTrackPan / setTrackMute and master volume clamping', () => {
    const mixer = new AudioMixer(null as any);
    const trackId = 't1';
    const track: any = {
      id: trackId,
      name: 'guitar',
      filePath: 'guitar.wav',
      isPlaying: false,
      isMuted: false,
      volume: 1,
      pan: 0,
      setVolume: jest.fn(function (v: number) { this.volume = v; }),
      setPan: jest.fn(function (p: number) { this.pan = p; }),
      setMute: jest.fn(function (m: boolean) { this.isMuted = m; }),
      getState: jest.fn(() => ({ id: trackId, name: 'guitar', isPlaying: false, volume: 1, pan: 0, isMuted: false }))
    };
    mixer.tracks.set(trackId, track);

    expect(mixer.setTrackVolume(trackId, 0.5)).toBe(true);
    expect(track.setVolume).toHaveBeenCalledWith(0.5);

    expect(mixer.setTrackPan(trackId, -0.7)).toBe(true);
    expect(track.setPan).toHaveBeenCalledWith(-0.7);

    expect(mixer.setTrackMute(trackId, true)).toBe(true);
    expect(track.setMute).toHaveBeenCalledWith(true);

    mixer.setMasterVolume(3);
    expect(mixer.masterVolume).toBe(2); // clamped to max 2
    mixer.setMasterVolume(-1);
    expect(mixer.masterVolume).toBe(0); // clamped to min 0
  });

  test('getMixerState returns tracks and memory info', () => {
    const mixer = new AudioMixer(null as any);
    const trackId = 's1';
    const track: any = { id: trackId, name: 'x', getState: jest.fn(() => ({ id: trackId, name: 'x', isPlaying: false, volume: 1, pan: 0, isMuted: false })) };
    mixer.tracks.set(trackId, track);
    const state = mixer.getMixerState();
    expect(Array.isArray(state.tracks)).toBe(true);
    expect(state.tracks[0].id).toBe(trackId);
    expect(typeof state.memoryUsage.rss).toBe('number');
  });

  test('applyDefaultPanning sets correct pans when a click track exists', () => {
    const mixer = new AudioMixer(null as any);
    const click: any = { id: 'c', name: 'Click Track', setPan: jest.fn(), isPlaying: false };
    const guitar: any = { id: 'g', name: 'Guitar', setPan: jest.fn(), isPlaying: false };
    mixer.tracks.set(click.id, click);
    mixer.tracks.set(guitar.id, guitar);
    mixer.applyDefaultPanning();
    expect(click.setPan).toHaveBeenCalledWith(-1);
    expect(guitar.setPan).toHaveBeenCalledWith(1);
  });

  test('performCrossfade transitions volumes and removes old tracks', async () => {
    const mixer = new AudioMixer(null as any);
    const oldId = 'old';
    const newId = 'new';
    const oldTrack: any = { id: oldId, name: 'old', isPlaying: true, originalVolume: 1, setVolume: jest.fn(), stop: jest.fn() };
    const newTrack: any = { id: newId, name: 'new', isPlaying: true, originalVolume: 1, setVolume: jest.fn() };
    mixer.tracks.set(oldId, oldTrack);
    mixer.tracks.set(newId, newTrack);

    // small duration so the test runs quickly
    mixer.activeCrossfade = { startTime: Date.now(), duration: 100, oldTracks: [oldId], newTracks: [newId], completed: false } as any;

    const p = (mixer as any).performCrossfade();
    await p;

    expect(oldTrack.stop).toHaveBeenCalled();
    expect(mixer.tracks.has(oldId)).toBe(false);
    expect(newTrack.setVolume).toHaveBeenCalled();
    expect(mixer.activeCrossfade).toBeNull();
  });

  test('crossfadeToNewTracks loads new tracks and initiates crossfade (mocked load)', async () => {
    const mixer = new AudioMixer(null as any);
    // seed an existing playing track
    const existing: any = { id: 'e1', name: 'Existing', isPlaying: true, setVolume: jest.fn(), play: jest.fn(), originalVolume: 1, setPan: jest.fn() };
    mixer.tracks.set(existing.id, existing);

    // mock loadTrack to avoid filesystem/ffmpeg operations
    jest.spyOn(mixer as any, 'loadTrack').mockImplementation(async (...args: any[]) => {
      const p = args[0] as string;
      const id = `new_${Math.random().toString(36).slice(2,8)}`;
      const t: any = { id, name: p, isPlaying: false, volume: 1, originalVolume: 1, setVolume: jest.fn(), play: jest.fn(), setPan: jest.fn() };
      mixer.tracks.set(id, t);
      return id;
    });

    // mock performCrossfade to avoid timer-based work in this unit test
    jest.spyOn(mixer as any, 'performCrossfade').mockImplementation(async () => { mixer.activeCrossfade = null; return; });

    const promise = mixer.crossfadeToNewTracks(['a.wav', 'b.wav'], 50);
    await promise;

    // ensure activeCrossfade is cleared after completion
    expect(mixer.activeCrossfade).toBeNull();
    // ensure at least one new track exists in the map
    expect(Array.from(mixer.tracks.values()).some((t: any) => t.name === 'a.wav' || t.name === 'b.wav')).toBe(true);
  });

});
