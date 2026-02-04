import { mixer, serverInstance } from '../../../harmonysync-audio-service/server';
import { MockAudioTrack } from '../../mocks/audio-service';

describe('Server Socket handlers', () => {
  test('connection handler emits mixer_state_changed and registers socket events', async () => {
    // capture the registered connection listener
    const io: any = serverInstance.io as any;
    const listeners = io.listeners('connection') || io._events?.connection ? io.listeners('connection') : [];
    const connHandler = (listeners && listeners[0]) || (io._events && io._events.connection && io._events.connection[0]);
    expect(typeof connHandler).toBe('function');

    const handlers: Record<string, Function> = {};
    const emitted: Array<any> = [];
    const fakeSocket: any = {
      id: 'fake-sock',
      emit: (...args: any[]) => { emitted.push(args); },
      on: (ev: string, cb: Function) => { handlers[ev] = cb; }
    };

    // invoke connection handler
    connHandler(fakeSocket);

    // initial emit should have sent mixer_state_changed to the connecting socket
    expect(emitted.length).toBeGreaterThan(0);
    const found = emitted.find(e => e[0] === 'mixer_state_changed');
    expect(found).toBeDefined();

    // Test load_track handler: spy on mixer.loadTrack
    const loadSpy = jest.spyOn(mixer as any, 'loadTrack').mockResolvedValue('t-load-1');
    await (handlers['load_track'] as Function)({ filePath: '/tmp/x.wav', name: 'X' });
    expect(loadSpy).toHaveBeenCalled();
    // socket should have emitted track_loaded
    expect(emitted.some(e => e[0] === 'track_loaded')).toBe(true);
    loadSpy.mockRestore();

    // Use MockAudioTrack for mute/pan/volume handlers
    const mockTrack = new MockAudioTrack('t1', 'T1', '/tmp', 0, 2, 44100);
    mixer.tracks.set(mockTrack.id, mockTrack as any);

    // Call set_track_mute
    await (handlers['set_track_mute'] as Function)({ trackId: mockTrack.id, muted: true });
    expect(mockTrack.isMuted).toBe(true);
    expect(emitted.some(e => e[0] === 'track_mute_changed')).toBe(true);

    // Call set_track_pan
    await (handlers['set_track_pan'] as Function)({ trackId: mockTrack.id, pan: -1 });
    expect(mockTrack.pan).toBe(-1);
    expect(emitted.some(e => e[0] === 'track_pan_changed')).toBe(true);

    // Call set_track_volume
    await (handlers['set_track_volume'] as Function)({ trackId: mockTrack.id, volume: 0.5 });
    expect(mockTrack.volume).toBeCloseTo(0.5);
    expect(emitted.some(e => e[0] === 'track_volume_changed')).toBe(true);
  });

  test('unhandledRejection handler logs error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.emit('unhandledRejection', 'bad', Promise.resolve());
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('load_track handler emits error when mixer.loadTrack rejects', async () => {
    const io: any = serverInstance.io as any;
    const listeners = io.listeners('connection') || io._events?.connection ? io.listeners('connection') : [];
    const connHandler = (listeners && listeners[0]) || (io._events && io._events.connection && io._events.connection[0]);

    const handlers: Record<string, Function> = {};
    const emitted: Array<any> = [];
    const fakeSocket: any = {
      id: 'fake-err-load',
      emit: (...args: any[]) => { emitted.push(args); },
      on: (ev: string, cb: Function) => { handlers[ev] = cb; }
    };

    connHandler(fakeSocket);

    const loadSpy = jest.spyOn(mixer as any, 'loadTrack').mockRejectedValue(new Error('boom'));
    await (handlers['load_track'] as Function)({ filePath: '/tmp/bad.wav', name: 'Bad' });
    expect(loadSpy).toHaveBeenCalled();

    const errEmit = emitted.find(e => e[0] === 'error');
    expect(errEmit).toBeDefined();
    expect(errEmit[1]).toMatchObject({ message: 'boom' });

    loadSpy.mockRestore();
  });

  test('set_track_mute emits error when track not found', () => {
    const io: any = serverInstance.io as any;
    const listeners = io.listeners('connection') || io._events?.connection ? io.listeners('connection') : [];
    const connHandler = (listeners && listeners[0]) || (io._events && io._events.connection && io._events.connection[0]);

    const handlers: Record<string, Function> = {};
    const emitted: Array<any> = [];
    const fakeSocket: any = {
      id: 'fake-err-mute',
      emit: (...args: any[]) => { emitted.push(args); },
      on: (ev: string, cb: Function) => { handlers[ev] = cb; }
    };

    connHandler(fakeSocket);

    const muteSpy = jest.spyOn(mixer as any, 'setTrackMute').mockReturnValue(false);
    (handlers['set_track_mute'] as Function)({ trackId: 'nope', muted: true });
    expect(muteSpy).toHaveBeenCalled();

    const errEmit = emitted.find(e => e[0] === 'error');
    expect(errEmit).toBeDefined();
    expect(errEmit[1]).toMatchObject({ message: 'Failed to set track mute: track nope not found' });

    muteSpy.mockRestore();
  });
});
