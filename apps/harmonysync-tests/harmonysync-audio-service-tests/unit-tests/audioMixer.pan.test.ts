import AudioMixer from '../../../harmonysync-audio-service/audioMixer';

describe('AudioMixer ffplay pan argument', () => {
  test('startPreparedTrack includes pan filter when pan non-zero', async () => {
    const mixer: any = new AudioMixer();
    // ensure ffplay path is found
    jest.spyOn(mixer, 'commandExists').mockReturnValue(true);
    jest.spyOn(mixer, 'getCommandPath').mockReturnValue('/usr/bin/ffplay');

    const childProc = { on: jest.fn(), kill: jest.fn() } as any;
    const cp = require('child_process');
    const spawnSpy = jest.spyOn(cp, 'spawn').mockImplementation((..._args: any[]) => {
      const [_cmd, args] = _args as [string, any[]];
      // assert args contain pan filter
      expect(args).toEqual(expect.arrayContaining([expect.stringContaining('-af')]));
      return childProc;
    });

    const track: any = { id: 'p1', name: 'PanTest', filePath: '/tmp/p.wav', pan: -0.5, isMuted: false, volume: 1 };
    await (mixer as any).startPreparedTrack(track, '/tmp/p.wav');

    spawnSpy.mockRestore();
  });
});
