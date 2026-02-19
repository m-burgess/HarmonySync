import setupIpcHandlers from '../../../ipc-handlers';

describe('IPC Handler registration', () => {
  test('registers expected handlers', () => {
    const handlers = new Map<string, Function>();

    const mockIpcMain: any = {
      handle: (channel: string, fn: Function) => {
        handlers.set(channel, fn);
      },
      on: (event: string, fn: Function) => {
        handlers.set(`on:${event}`, fn);
      },
    };

    const mockServices: any = {};

    // Call setup (should register handlers, not invoke them)
    setupIpcHandlers(mockIpcMain, mockServices);

    expect(handlers.size).toBeGreaterThan(0);
    expect(handlers.has('dialog:openDirectory')).toBe(true);
    expect(handlers.has('fs:readFile')).toBe(true);
    expect(handlers.has('ffmpeg:convertToOgg')).toBe(true);
    expect(handlers.has('video:getMetadata')).toBe(true);
    expect(handlers.has('youtube:extractId')).toBe(true);
    expect(handlers.has('image:getMetadata')).toBe(true);
    expect(handlers.has('text:generateBackgroundCSS')).toBe(true);
    expect(handlers.has('service-order:loadSongMetadata')).toBe(true);
    // event-based handlers
    expect(handlers.has('on:app:folder-loaded')).toBe(true);
  });
});
