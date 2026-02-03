describe('AudioTrack playback behavior', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('play() uses Audic and cleans up on ended', async () => {
    jest.resetModules();
    // Use a local FakeAudic and inject via getAudic() to avoid ESM import timing issues
    let lastInstance: any = null;
    const FakeAudic = class {
      public volume: number = 0;
      public handlers: Record<string, Function> = {} as any;
      constructor(p: string) { lastInstance = this; }
      play() {}
      destroy() {}
      on(ev: string, cb: Function) { this.handlers[ev] = cb; }
    };

    // Mock the 'audic' module so the module-local lazy-require returns our FakeAudic
    jest.mock('audic', () => ({ default: FakeAudic }));
    const AudioTrackModule = require('../audioTrack') as typeof import('../audioTrack');
    const wav = require('node-wav');
    const fs = require('fs');
    const os = require('os');
    const AudioTrack = AudioTrackModule.default as any;

    const track = new AudioTrack('p1', 'MyTrack', '/tmp/my.wav', 0.01, 2, 44100);

    jest.spyOn(wav, 'decode').mockReturnValue({ channelData: [new Float32Array([0.1,0.2]), new Float32Array([0.1,0.2])], sampleRate: 44100 });
    jest.spyOn(wav, 'encode').mockReturnValue(Buffer.from([1,2,3]));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1,2]));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    track.play();

    // Access lastInstance captured by the mock
    const instance = lastInstance;
    expect(instance).not.toBeNull();
    expect(instance.play).toBeDefined();
    expect(track.isPlaying).toBe(true);

    // trigger ended
    instance.handlers && instance.handlers['ended'] && instance.handlers['ended']();
    expect(track.isPlaying).toBe(false);
    expect(track.audic).toBeNull();
    expect(track.tempFilePath).toBeNull();
  });

  test('play() handles audic error by cleaning up', async () => {
    jest.resetModules();
    let lastInstance: any = null;
    const FakeAudic = class {
      public volume: number = 0;
      public handlers: Record<string, Function> = {} as any;
      constructor(p: string) { lastInstance = this; }
      play() {}
      destroy() {}
      on(ev: string, cb: Function) { this.handlers[ev] = cb; }
    };

    // Mock the 'audic' module so the module-local lazy-require returns our FakeAudic
    jest.mock('audic', () => ({ default: FakeAudic }));
    const AudioTrackModule = require('../audioTrack') as typeof import('../audioTrack');

    const wav = require('node-wav');
    const fs = require('fs');
    const os = require('os');
    const AudioTrack = AudioTrackModule.default as any;

    const track = new AudioTrack('p2', 'ErrTrack', '/tmp/err.wav', 0.01, 2, 44100);
    jest.spyOn(wav, 'decode').mockReturnValue({ channelData: [new Float32Array([0.1]), new Float32Array([0.1])], sampleRate: 44100 });
    jest.spyOn(wav, 'encode').mockReturnValue(Buffer.from([1]));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1]));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    track.play();
    expect(track.isPlaying).toBe(true);
    const instance = lastInstance;
    // trigger error
    instance.handlers && instance.handlers['error'] && instance.handlers['error'](new Error('boom'));
    expect(track.isPlaying).toBe(false);
    expect(track.audic).toBeNull();
    expect(track.tempFilePath).toBeNull();
  });

  test('play() handles decode error and leaves isPlaying false', () => {
    jest.resetModules();
    const AudioTrackModule = require('../audioTrack') as typeof import('../audioTrack');
    const wav = require('node-wav');
    const fs = require('fs');
    const AudioTrack = AudioTrackModule.default as any;

    const track = new AudioTrack('p3', 'Bad', '/tmp/bad.wav', 0, 2, 44100);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1]));
    jest.spyOn(wav, 'decode').mockImplementation(() => { throw new Error('decode failed'); });

    track.play();
    expect(track.isPlaying).toBe(false);
  });
});
