describe('server process and server error handlers', () => {
  const originalEnv = process.env.NODE_ENV;
  let originalExit: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = originalEnv;
    (process.exit as any) = originalExit;
    consoleErrorSpy.mockRestore();
  });

  test('uncaughtException with EADDRINUSE calls process.exit(1)', () => {
    // Ensure server module attaches process handlers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../server');

    const err: any = new Error('addr');
    err.code = 'EADDRINUSE';
    // emit handler
    process.emit('uncaughtException', err);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('unhandledRejection logs error without exiting', () => {
    // Ensure server module attaches process handlers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../server');

    // Emit the event directly to avoid creating an actually unhandled rejected Promise
    process.emit('unhandledRejection', new Error('boom'), {} as any);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('uncaughtException non-EADDRINUSE calls process.exit(1)', () => {
    // Ensure server module attaches process handlers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../server');

    const err: any = new Error('boom');
    // emit handler
    process.emit('uncaughtException', err);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('server.on error handler attached when NODE_ENV not test and calls exit on EADDRINUSE', () => {
    // mock http.createServer before requiring server to capture server.on/listen
    process.env.NODE_ENV = 'production';
    const handlers: any = {};
    // Create a fake server based on EventEmitter so socket.io can attach to it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const EventEmitter = require('events');
    const fakeServer = Object.assign(new EventEmitter(), {
      listen: jest.fn((port: any, host: any, cb: any) => cb && cb()),
      close: jest.fn((cb: any) => cb && cb()),
      address: jest.fn(() => ({ port: 3001 })),
    }) as any;
    // capture handlers attached via .on
    const originalOn = fakeServer.on.bind(fakeServer);
    fakeServer.on = jest.fn((name: string, cb: any) => { handlers[name] = cb; return originalOn(name, cb); });

    jest.resetModules();
    jest.doMock('http', () => {
      const realHttp = jest.requireActual('http');
      return { ...realHttp, createServer: () => fakeServer };
    });

    // require server module now
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../server');
    // simulate server error
    handlers.error({ code: 'EADDRINUSE' });
    expect(process.exit).toHaveBeenCalled();

    jest.dontMock('http');
  });
});
