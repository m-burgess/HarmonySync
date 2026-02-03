import { AudioMixer } from '../audioMixer';
import { AudioTrack } from '../audioTrack';

describe('AudioMixer fallback and error paths', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('prepareTrackForPlayback rejects when ffmpeg conversion fails', async () => {
    const mixer = new AudioMixer(null as any);
    const track = new AudioTrack('t-fffail', 'MP3 Track', '/tmp/bad.mp3', 0, 2, 44100);

    // Mock spawn to simulate ffmpeg failing (close with non-zero)
    const cp = require('child_process');
    const spawnSpy = jest.spyOn(cp, 'spawn').mockImplementation((..._args: any[]) => {
      return {
        on: (ev: string, cb: Function) => {
          if (ev === 'close') setImmediate(() => cb(1));
        }
      } as any;
    });

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(mixer.startTrackWithClock(track, false)).rejects.toThrow();
    expect(spawnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();

    spawnSpy.mockRestore();
    errSpy.mockRestore();
  });

  test('startTrackWithClock uses ffplay when available', async () => {
    const mixer = new AudioMixer(null as any);
    const track = new AudioTrack('t-ffplay', 'MP3 Track', '/tmp/good.mp3', 0, 2, 44100);

    // Mock commandExists/getCommandPath to indicate ffplay exists
    jest.spyOn(mixer, 'commandExists').mockReturnValue(true);
    jest.spyOn(mixer, 'getCommandPath').mockReturnValue('ffplay');

    // Mock spawn: ffmpeg conversion succeeds (close 0), ffplay returns a process
    const cp = require('child_process');
    const spawnSpy = jest.spyOn(cp, 'spawn').mockImplementation((...args: any[]) => {
      const cmd = String(args[0] || '');
      if (cmd.includes('ffmpeg')) {
        return { on: (ev: string, cb: Function) => { if (ev === 'close') setImmediate(() => cb(0)); } } as any;
      }
      // ffplay process stub
      return { on: (ev: string, cb: Function) => { /* no-op, don't close */ } , kill: () => {} } as any;
    });

    await expect(mixer.startTrackWithClock(track, false)).resolves.toBeUndefined();
    // After starting, ffplay branch sets isPlaying = true
    expect(track.isPlaying).toBe(true);

    spawnSpy.mockRestore();
  });

  test('startPreparedTrack falls back to audic but warns when audic missing', async () => {
    const mixer = new AudioMixer(null as any);
    const track = new AudioTrack('t-noaudic', 'MP3 Track', '/tmp/noaudic.mp3', 0, 2, 44100);

    // Ensure ffplay is not available
    jest.spyOn(mixer, 'commandExists').mockReturnValue(false);
    // Mock child_process.spawn for ffmpeg conversion to succeed
    const cp = require('child_process');
    const spawnSpy = jest.spyOn(cp, 'spawn').mockImplementation((...args: any[]) => {
      return { on: (ev: string, cb: Function) => { if (ev === 'close') setImmediate(() => cb(0)); } } as any;
    });

    // Mock getAudic to return null so audic fallback isn't available
    const at = require('../audioTrack');
    jest.spyOn(at, 'getAudic').mockReturnValue(null);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(mixer.startTrackWithClock(track, false)).resolves.toBeUndefined();
    // Because audic is missing, playback did not start (isPlaying false)
    expect(track.isPlaying).toBe(false);
    expect(warnSpy).toHaveBeenCalled();

    spawnSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
