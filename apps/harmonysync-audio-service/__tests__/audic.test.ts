import { AudioMixer, AudioTrack } from '../server';

describe('Audic fallback playback', () => {
  test('startPreparedTrack uses Audic when ffplay not available and cleans up after duration', async () => {
    const m = new AudioMixer();
    // Force ffplay not available
    (m as any).commandExists = jest.fn(() => false);

    // Inject a FakeAudic via getAudic
    const audioTrackModule = require('../audioTrack') as typeof import('../audioTrack');
    let last: any = null;
    const FakeAudic = class {
      public volume = 1.0;
      public handlers: Record<string, Function[]> = {} as any;
      constructor(p: string) { last = this; }
      play() {}
      destroy() {}
      on(event: string, cb: Function) { (this.handlers[event] ||= []).push(cb); }
    };
    jest.spyOn(audioTrackModule, 'getAudic').mockImplementation(() => FakeAudic as any);

    const t = new AudioTrack('z1', 'TestAudic', '/tmp/test.wav', 0.01, 2, 44100);

    jest.useFakeTimers();

    const startPromise = (m as any).startPreparedTrack(t, t.filePath);

    // Immediately after starting, track should be marked playing
    expect(t.isPlaying).toBe(true);

    // Advance timers to trigger the duration-based cleanup
    jest.runAllTimers();
    await startPromise;

    // After the timeout, track should be stopped (isPlaying false)
    expect(t.isPlaying).toBe(false);
    // Ensure our FakeAudic constructor was actually used
    expect(last).not.toBeNull();

    jest.useRealTimers();
  });
});
