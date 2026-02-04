import { AudioMixer, AudioTrack } from '../../../harmonysync-audio-service/server';

describe('Synchronization to click track', () => {
  test('startMasterClockPlayback schedules all tracks with identical startAtMs and uses prepared file paths', async () => {
    const mixer = new AudioMixer();

    const click = new AudioTrack('c1', 'Click', '/tmp/click.wav', 10, 2, 44100);
    const t1 = new AudioTrack('a1', 'Guitar', '/tmp/g1.wav', 10, 2, 44100);
    const t2 = new AudioTrack('a2', 'Piano', '/tmp/p2.wav', 10, 2, 44100);

    // Add to mixer map
    mixer.tracks.set(click.id, click);
    mixer.tracks.set(t1.id, t1);
    mixer.tracks.set(t2.id, t2);

    // Stub prepareTrackForPlayback to return per-track paths
    const preparedMap = new Map<string,string>([
      [click.id, '/prepared/click.wav'],
      [t1.id, '/prepared/g1.wav'],
      [t2.id, '/prepared/p2.wav']
    ]);

    (mixer as any).prepareTrackForPlayback = jest.fn(async (track: any) => {
      return preparedMap.get(track.id) as string;
    });

    const calls: Array<{trackId:string, audioFilePath:string, startAtMs:number}> = [];

    (mixer as any).startPreparedTrackAt = jest.fn(async (...args: any[]) => {
      const [track, audioFilePath, startAtMs] = args;
      calls.push({ trackId: track.id, audioFilePath, startAtMs });
      return Promise.resolve();
    });

    const start = Date.now();
    jest.useFakeTimers();
    await mixer.startMasterClockPlayback([click, t1, t2], click);
    // Run deferred timers (master clock verification) to avoid logging after tests finish
    jest.runAllTimers();
    jest.useRealTimers();
    const end = Date.now();

    // Ensure we recorded three calls
    expect(calls.length).toBe(3);

    // All startAtMs values should be identical and in the future relative to when we started
    const allStartAtMs = calls.map(c => c.startAtMs);
    expect(new Set(allStartAtMs).size).toBe(1);
    const startAtMs = allStartAtMs[0];
    expect(startAtMs).toBeGreaterThanOrEqual(start);
    expect(startAtMs).toBeLessThanOrEqual(end + 1000);

    // Verify that the audioFilePath used matches our prepared paths
    for (const c of calls) {
      expect(c.audioFilePath).toBe(preparedMap.get(c.trackId));
    }
  });
});
