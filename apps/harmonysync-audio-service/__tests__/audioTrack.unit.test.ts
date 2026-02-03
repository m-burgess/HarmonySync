import AudioTrack from '../audioTrack';
import child from 'child_process';
import fs from 'fs';

describe('AudioTrack unit tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('setVolume applies to audic instance when present', () => {
    const track = new AudioTrack('id1', 't', '/tmp/f.wav', 1, 2, 44100);
    const fakeAudic: any = { volume: 0.1, play: jest.fn(), destroy: jest.fn(), on: jest.fn() };
    track.audic = fakeAudic;
    track.setVolume(0.5);
    expect(track.volume).toBe(0.5);
    expect(fakeAudic.volume).toBe(0.5);
  });

  test('setPan saves state when not playing', () => {
    const track = new AudioTrack('id2', 'panner', '/tmp/f.wav', 1, 2, 44100);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    track.audioProcess = null;
    track.setPan(-0.8);
    expect(track.pan).toBe(-0.8);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not playing'));
  });

  test('setMute saves state when not playing', () => {
    const track = new AudioTrack('id3', 'muter', '/tmp/f.wav', 1, 2, 44100);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    track.audioProcess = null;
    track.audic = null;
    track.setMute(true);
    expect(track.isMuted).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not playing'));
  });

  test('checkCommand returns true/false based on execSync', () => {
    const track = new AudioTrack('id4', 'cmd', '/tmp/f.wav', 1, 2, 44100);
    jest.spyOn(child, 'execSync').mockImplementationOnce(() => '/usr/bin/which\n');
    expect(track.checkCommand('ffplay')).toBe(true);
    (child.execSync as jest.Mock).mockImplementation(() => { throw new Error('nope'); });
    expect(track.checkCommand('nope')).toBe(false);
  });

  test('createStream destroys previous stream and returns new stream', () => {
    const track = new AudioTrack('id5', 'streamer', '/tmp/f.wav', 1, 2, 44100);
    const fakeStream1: any = { destroy: jest.fn() };
    const fakeStream2: any = { destroy: jest.fn() };
    jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => fakeStream1 as any).mockImplementationOnce(() => fakeStream2 as any);
    const s1 = track.createStream();
    expect(s1).toBe(fakeStream1);
    const s2 = track.createStream();
    expect(fakeStream1.destroy).toHaveBeenCalled();
    expect(s2).toBe(fakeStream2);
  });
});
