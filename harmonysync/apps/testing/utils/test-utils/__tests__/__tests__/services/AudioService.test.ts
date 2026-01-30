/**
 * AudioService Tests
 * 
 * These tests demonstrate how Services are easy to test
 * by mocking the IPC layer.
 */
import AudioService from '../../services/AudioService';

describe('AudioService', () => {
  let audioService;
  let mockIpcService;

  beforeEach(() => {
    mockIpcService = {
      invoke: jest.fn(),
      on: jest.fn(() => () => {})
    };
    audioService = new AudioService(mockIpcService);
  });

  test('loadTracks calls IPC with correct channel', async () => {
    const mockTracks = [{ name: 'Track 1' }];
    mockIpcService.invoke.mockResolvedValue(mockTracks);

    const result = await audioService.loadTracks('/songs/song1');

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:loadTracks', '/songs/song1');
    expect(result).toEqual(mockTracks);
  });

  test('transpose calls IPC with correct parameters', async () => {
    const mockResult = { success: true, outputPath: '/songs/song1_+2' };
    mockIpcService.invoke.mockResolvedValue(mockResult);

    const result = await audioService.transpose('/songs/song1', 2);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:transpose', '/songs/song1', 2);
    expect(result).toEqual(mockResult);
  });

  test('play calls IPC', async () => {
    mockIpcService.invoke.mockResolvedValue();

    await audioService.play();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:play');
  });

  test('stop calls IPC', async () => {
    mockIpcService.invoke.mockResolvedValue();

    await audioService.stop();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:stop');
  });

  test('setTrackVolume calls IPC with correct parameters', async () => {
    mockIpcService.invoke.mockResolvedValue();

    await audioService.setTrackVolume(0, 0.5);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:setTrackVolume', 0, 0.5);
  });

  test('setTrackPan calls IPC with correct parameters', async () => {
    mockIpcService.invoke.mockResolvedValue();

    await audioService.setTrackPan(0, -1);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:setTrackPan', 0, -1);
  });

  test('setTrackMute calls IPC with correct parameters', async () => {
    mockIpcService.invoke.mockResolvedValue();

    await audioService.setTrackMute(0, true);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:setTrackMute', 0, true);
  });

  test('saveMixerConfig calls IPC with correct parameters', async () => {
    const config = { tracks: [{ volume: 0.5 }] };
    mockIpcService.invoke.mockResolvedValue();

    await audioService.saveMixerConfig('/songs/song1', config);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:saveMixerConfig', '/songs/song1', config);
  });

  test('loadMixerConfig calls IPC with correct parameters', async () => {
    const config = { tracks: [{ volume: 0.5 }] };
    mockIpcService.invoke.mockResolvedValue(config);

    const result = await audioService.loadMixerConfig('/songs/song1');

    expect(mockIpcService.invoke).toHaveBeenCalledWith('audio:loadMixerConfig', '/songs/song1');
    expect(result).toEqual(config);
  });

  test('onPositionUpdate registers listener', () => {
    const callback = jest.fn();
    const cleanup = audioService.onPositionUpdate(callback);

    expect(mockIpcService.on).toHaveBeenCalledWith('audio:positionUpdate', callback);
    expect(typeof cleanup).toBe('function');
  });

  test('onStateChange registers listener', () => {
    const callback = jest.fn();
    const cleanup = audioService.onStateChange(callback);

    expect(mockIpcService.on).toHaveBeenCalledWith('audio:stateChange', callback);
    expect(typeof cleanup).toBe('function');
  });
});
