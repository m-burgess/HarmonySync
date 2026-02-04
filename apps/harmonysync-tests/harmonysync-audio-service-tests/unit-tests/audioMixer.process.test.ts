import AudioMixer from '../../../harmonysync-audio-service/audioMixer';

describe('AudioMixer process/command behaviors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('commandExists and getCommandPath honor execSync success/failure', () => {
    const mixer = new AudioMixer(null as any);
    const child = require('child_process');
    // execSync returns a path
    jest.spyOn(child, 'execSync').mockImplementation(() => '/usr/bin/ffplay\n');
    expect(mixer.commandExists('ffplay')).toBe(true);
    expect(mixer.getCommandPath('ffplay')).toContain('/usr/bin/ffplay');

    // execSync now throws -> command missing
    (child.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    expect(mixer.commandExists('nope')).toBe(false);
    expect(mixer.getCommandPath('nope')).toBe('nope');
  });

  test('prepareTrackForPlayback converts non-wav via mocked ffmpeg spawn', async () => {
    const mixer = new AudioMixer(null as any);
    const child = require('child_process');
    const track: any = { id: 'tt', name: 'MP3 Track', filePath: '/some/path/song.mp3', audic: null, audioProcess: null, tempFilePath: null };

    // mock spawn to simulate ffmpeg conversion success
    const spawnMock = jest.fn().mockImplementation(() => {
      const handlers: any = {};
      return {
        on: (ev: string, cb: (...a: any[]) => void) => { handlers[ev] = cb; if (ev === 'close') setTimeout(() => cb(0), 0); },
        stderr: { on: () => {} }
      } as any;
    });
    jest.spyOn(child, 'spawn').mockImplementation(spawnMock as any);

    const result = await (mixer as any).prepareTrackForPlayback(track);
    expect(typeof result).toBe('string');
    expect(result.endsWith('.wav')).toBe(true);
    expect(track.tempFilePath).toBe(result);
  });

  test('startPreparedTrack uses ffplay when available and sets isPlaying then clears on close', async () => {
    const mixer = new AudioMixer(null as any);
    const child = require('child_process');
    const track: any = { id: 't1', name: 'T1', isMuted: false, volume: 0.5, pan: 0, audioProcess: null, audic: null, tempFilePath: null };

    // mock commandExists/getCommandPath to indicate ffplay available
    jest.spyOn(mixer as any, 'commandExists').mockReturnValue(true);
    jest.spyOn(mixer as any, 'getCommandPath').mockReturnValue('/usr/bin/ffplay');

    // spawn should return an object where we can capture the close handler
    let closeHandler: ((code?: number) => void) | null = null;
    const spawnMock = jest.fn().mockImplementation(() => ({ on: (ev: string, cb: any) => { if (ev === 'close') closeHandler = cb; } }));
    jest.spyOn(child, 'spawn').mockImplementation(spawnMock as any);

    await (mixer as any).startPreparedTrack(track, '/tmp/file.wav');
    expect(track.isPlaying).toBe(true);
    expect(track.audioProcess).not.toBeNull();

    // simulate process close
    if (closeHandler) (closeHandler as any)();
    // give microtask tick
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(track.isPlaying).toBe(false);
  });
});
