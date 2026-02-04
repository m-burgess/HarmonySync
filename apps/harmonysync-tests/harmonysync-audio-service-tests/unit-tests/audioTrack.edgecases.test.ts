describe('AudioTrack playback edge cases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('play() without Audic keeps temp file and stop cleans up', () => {
    jest.resetModules();
    const AudioTrackModule = require('../audioTrack') as typeof import('../../../harmonysync-audio-service/audioTrack');
    const wav = require('node-wav');
    const fs = require('fs');
    const os = require('os');
    const AudioTrack = AudioTrackModule.default as any;

    // ensure getAudic returns null
    jest.spyOn(AudioTrackModule, 'getAudic').mockReturnValue(null);

    jest.spyOn(wav, 'decode').mockReturnValue({ channelData: [new Float32Array([0.1,0.2]), new Float32Array([0.1,0.2])], sampleRate: 44100 });
    jest.spyOn(wav, 'encode').mockReturnValue(Buffer.from([1,2]));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1,2]));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    // Pretend the temp file exists so stop() will attempt unlink
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const track = new AudioTrack('e1', 'NoAudic', '/tmp/noaudic.wav', 0.5, 2, 44100);
    track.play();

    expect(track.audic).toBeNull();
    expect(track.tempFilePath).not.toBeNull();
    expect(track.isPlaying).toBe(true);

    track.stop();
    expect(unlinkSpy).toHaveBeenCalled();
    expect(track.tempFilePath).toBeNull();
    expect(track.isPlaying).toBe(false);
  });

  test('play() decode error leaves isPlaying false', () => {
    jest.resetModules();
    const AudioTrackModule = require('../audioTrack') as typeof import('../../../harmonysync-audio-service/audioTrack');
    const wav = require('node-wav');
    const fs = require('fs');
    const AudioTrack = AudioTrackModule.default as any;

    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1,2]));
    jest.spyOn(wav, 'decode').mockImplementation(() => { throw new Error('bad wav'); });

    const track = new AudioTrack('e2', 'BadDecode', '/tmp/bad.wav', 0, 2, 44100);
    track.play();
    expect(track.isPlaying).toBe(false);
  });

  test('setVolume applies to Audic when playing', () => {
    jest.resetModules();

    const AudioTrackModule = require('../audioTrack') as typeof import('../../../harmonysync-audio-service/audioTrack');
    const wav = require('node-wav');
    const fs = require('fs');
    const os = require('os');
    const AudioTrack = AudioTrackModule.default as any;

    jest.spyOn(wav, 'decode').mockReturnValue({ channelData: [new Float32Array([0.1,0.2]), new Float32Array([0.1,0.2])], sampleRate: 44100 });
    jest.spyOn(wav, 'encode').mockReturnValue(Buffer.from([1,2]));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0,1,2]));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    const track = new AudioTrack('e3', 'AudicTrack', '/tmp/a.wav', 0.5, 2, 44100);
    // inject a fake Audic instance directly to test setVolume behavior
    const fake = new (class { volume = 0; handlers: Record<string, Function> = {}; play() {} destroy() {} on(ev: string, cb: Function) { this.handlers[ev] = cb; } })();
    track.audic = fake as any;
    track.isMuted = false;
    track.setVolume(0.5);
    expect(fake.volume).toBeCloseTo(0.5);
  });
});
