describe('AudioMixer ffmpeg/ffplay fallback behaviour', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('prepareTrackForPlayback converts MP3 to WAV via ffmpeg', async () => {
    jest.resetModules();
    const os = require('os');
    const child = require('child_process');

    jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    // Mock spawn to simulate ffmpeg success
    const spawnMock = jest.spyOn(child, 'spawn').mockImplementation(() => {
      return {
        on: (ev: string, cb: Function) => { if (ev === 'close') { setImmediate(() => cb(0)); } },
      } as any;
    });

    const { AudioTrack } = require('../audioTrack');
    const AudioMixer = require('../audioMixer').AudioMixer;

    const mixer = new AudioMixer(null);
    const track = new AudioTrack('m1', 'MP3 Track', '/tmp/source.mp3', 1, 2, 44100);

    // Call private method via any
    const audioFilePath = await (mixer as any).prepareTrackForPlayback(track);
    expect(audioFilePath).toContain('.wav');
    expect(track.tempFilePath).toBe(audioFilePath);
    expect(spawnMock).toHaveBeenCalled();
  });

  test('startPreparedTrack uses ffplay when available', async () => {
    jest.resetModules();
    const child = require('child_process');

    const { AudioTrack } = require('../audioTrack');
    const AudioMixer = require('../audioMixer').AudioMixer;

    const mixer = new AudioMixer(null);
    // stub commandExists and getCommandPath to force ffplay path
    jest.spyOn(mixer as any, 'commandExists').mockReturnValue(true);
    jest.spyOn(mixer as any, 'getCommandPath').mockReturnValue('ffplay');

    // Mock spawn to return an object with on()
    const audioProc: any = { killed: false, stdin: { writable: true }, on: jest.fn() };
    const spawnMock = jest.spyOn(child, 'spawn').mockImplementation(() => audioProc);

    const track = new AudioTrack('m2', 'WavTrack', '/tmp/t.wav', 1, 2, 44100);
    await (mixer as any).startPreparedTrack(track, '/tmp/t.wav');

    expect(spawnMock).toHaveBeenCalled();
    expect(track.isPlaying).toBe(true);
    expect(track.audioProcess).not.toBeNull();
  });
});
