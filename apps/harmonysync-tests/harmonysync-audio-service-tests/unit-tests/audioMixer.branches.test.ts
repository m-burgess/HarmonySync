import fs from 'fs';
import path from 'path';
import AudioMixer from '../../../harmonysync-audio-service/audioMixer';

jest.useRealTimers();

describe('AudioMixer branch coverage tests', () => {
  let mixer: any;

  beforeEach(() => {
    mixer = new AudioMixer();
  });

  test('commandExists / getCommandPath behaviors', () => {
    const cp = require('child_process');
    const execSpy = jest.spyOn(cp, 'execSync');
    execSpy.mockImplementation((...args: any[]) => {
      const cmd = String(args[0] || '');
      if (cmd.startsWith('which') || cmd.startsWith('where')) return '/usr/bin/fakecmd';
      return '';
    });
    expect(mixer.commandExists('fakecmd')).toBe(true);
    expect(mixer.getCommandPath('fakecmd')).toBe('/usr/bin/fakecmd');
    execSpy.mockRestore();
  });

  test('commandExists returns false when execSync throws', () => {
    const cp = require('child_process');
    const execSpy = jest.spyOn(cp, 'execSync').mockImplementation(() => { throw new Error('no'); });
    expect(mixer.commandExists('missing')).toBe(false);
    expect(mixer.getCommandPath('missing')).toBe('missing');
    execSpy.mockRestore();
  });

  test('performCrossfade returns early when no activeCrossfade', async () => {
    // ensure no active crossfade
    mixer.activeCrossfade = null;
    // should not throw
    await expect(mixer.performCrossfade()).resolves.toBeUndefined();
  });

  test('crossfadeToNewTracks returns false when loadTrack fails', async () => {
    // make loadTrack throw for every path
    mixer.loadTrack = jest.fn().mockRejectedValue(new Error('load failed'));
    const result = await mixer.crossfadeToNewTracks(['nope.mp3'], 200);
    expect(result).toBe(false);
  });

  test('crossfadeToNewTracks starts crossfade when tracks load', async () => {
    // prepare an existing playing track
    const oldTrack: any = { id: 'old', name: 'old', isPlaying: true, setVolume: jest.fn(), stop: jest.fn(), setPan: jest.fn(), originalVolume: 1 };
    mixer.tracks.set('old', oldTrack);
    // mock loadTrack to add a new track and return id
    mixer.loadTrack = jest.fn().mockImplementation(async (p: string) => {
      const t = { id: 'new', name: path.basename(p), isPlaying: false, volume: 1, play: jest.fn(), setVolume: jest.fn(), setPan: jest.fn(), getState: () => ({ id: 'new' }) };
      mixer.tracks.set('new', t);
      return 'new';
    });
    // spy on performCrossfade so we don't run the full time-consuming loop here
    const perfSpy = jest.spyOn(mixer, 'performCrossfade').mockResolvedValue(undefined as any);
    const res = await mixer.crossfadeToNewTracks(['one.mp3'], 120);
    expect(res).toBe(true);
    expect(perfSpy).toHaveBeenCalled();
    perfSpy.mockRestore();
  });

  test('performCrossfade executes and updates volumes', async () => {
    // use real timers but keep duration very short so test finishes quickly
    jest.useRealTimers();
    // create old and new tracks
    const old: any = { id: 'o', name: 'o', isPlaying: true, originalVolume: 1, setVolume: jest.fn(), stop: jest.fn(), getState: () => ({ id: 'o' }) };
    const nw: any = { id: 'n', name: 'n', isPlaying: true, originalVolume: 1, setVolume: jest.fn(), getState: () => ({ id: 'n' }) };
    mixer.tracks.set('o', old);
    mixer.tracks.set('n', nw);
    mixer.activeCrossfade = { startTime: Date.now(), duration: 50, oldTracks: ['o'], newTracks: ['n'], completed: false };
    // provide an io emitter stub
    mixer.io = { emit: jest.fn() };
    await mixer.performCrossfade();
    // after completion, old.stop should have been called and new had volume restored
    expect(old.stop).toHaveBeenCalled();
    expect(nw.setVolume).toHaveBeenCalled();
    expect(mixer.io.emit).toHaveBeenCalledWith('crossfade_complete', expect.any(Object));
    jest.useRealTimers();
  });

  test('applyDefaultPanning applies pans when click present', () => {
    const click: any = { id: 'c', name: 'Click Track', setPan: jest.fn() };
    const other: any = { id: 'b', name: 'Bass', setPan: jest.fn() };
    mixer.tracks.set('c', click);
    mixer.tracks.set('b', other);
    mixer.applyDefaultPanning();
    expect(click.setPan).toHaveBeenCalledWith(-1);
    expect(other.setPan).toHaveBeenCalledWith(1);
  });

  test('applyDefaultPanningToTrack when no click present', () => {
    mixer.tracks.clear();
    const t: any = { id: 'x', name: 'Guitar', setPan: jest.fn() };
    mixer.tracks.set('x', t);
    mixer.applyDefaultPanningToTrack(t);
    // with no click present, pan should be 0
    expect(t.setPan).toHaveBeenCalledWith(0);
  });

  test('stopAllTracks cleans up files and stops processes', () => {
    const tmp = path.join(__dirname, 'temp-test.wav');
    fs.writeFileSync(tmp, 'data');
    const audioKill = jest.fn();
    const audicDestroy = jest.fn();
    const track: any = {
      id: 't1', name: 'T1', audioProcess: { kill: audioKill }, audic: { destroy: audicDestroy }, tempFilePath: tmp, isPlaying: true, getState: () => ({ id: 't1' })
    };
    mixer.tracks.set('t1', track);
    mixer.io = { emit: jest.fn() };
    mixer.stopAllTracks();
    expect(audioKill).toHaveBeenCalled();
    expect(audicDestroy).toHaveBeenCalled();
    expect(fs.existsSync(tmp)).toBe(false);
    expect(mixer.io.emit).toHaveBeenCalledWith('mixer_state_changed', expect.any(Object));
  });
});
