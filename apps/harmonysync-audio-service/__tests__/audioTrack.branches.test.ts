import fs from 'fs';
import wav from 'node-wav';
import { AudioTrack } from '../audioTrack';

describe('AudioTrack branch behaviours', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('setPan writes to mpv stdin when audioProcess.stdin.writable', () => {
    const track = new AudioTrack('t1', 'Test', '/tmp/t.wav', 1, 2, 44100);
    const write = jest.fn();
    track.audioProcess = { killed: false, stdin: { writable: true, write } } as any;

    track.setPan(-0.5);

    expect(write).toHaveBeenCalled();
    const called = write.mock.calls[0][0] as string;
    expect(called).toContain('audio-balance');
  });

  test('setPan logs saved state when not playing', () => {
    const track = new AudioTrack('t2', 'Test', '/tmp/t.wav', 1, 2, 44100);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    track.audioProcess = null;

    track.setPan(0.3);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not playing, pan state saved'));
    spy.mockRestore();
  });

  test('setMute writes volume command when mpv stdin writable', () => {
    const track = new AudioTrack('t3', 'Test', '/tmp/t.wav', 1, 2, 44100);
    const write = jest.fn();
    track.audioProcess = { killed: false, stdin: { writable: true, write } } as any;

    track.setMute(true);

    expect(write).toHaveBeenCalled();
    const called = write.mock.calls[0][0] as string;
    expect(called).toContain('set_property');
  });

  test('setVolume writes mpv command when audioProcess stdin writable', () => {
    const track = new AudioTrack('t4', 'Test', '/tmp/t.wav', 1, 2, 44100);
    const write = jest.fn();
    track.audioProcess = { killed: false, stdin: { writable: true, write } } as any;

    track.setVolume(0.5);

    expect(write).toHaveBeenCalled();
    const called = write.mock.calls[0][0] as string;
    expect(called).toContain('set_property');
  });

  test('play handles wav.decode throwing and cleans up isPlaying flag', () => {
    const track = new AudioTrack('t5', 'BadDecode', '/tmp/bad.wav', 1, 2, 44100);

    // Mock fs.readFileSync and wav.decode to throw
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => Buffer.from([0, 1, 2]) as any);
    jest.spyOn(wav, 'decode').mockImplementation(() => { throw new Error('bad wav'); });

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    track.play();

    // play sets isPlaying true then catches and should set false
    expect(track.isPlaying).toBe(false);
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });
});
