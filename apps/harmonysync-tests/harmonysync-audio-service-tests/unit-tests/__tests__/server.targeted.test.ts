const request = require('supertest');

describe('Server targeted branches', () => {
    beforeEach(() => { jest.resetModules(); });

    test('uncaughtException EADDRINUSE branch calls process.exit(1)', () => {
        jest.resetModules();
        const exitSpy = jest.spyOn(process as any, 'exit').mockImplementation(() => { /* noop */ });
        // Require server to register handlers
        require('../server');

        const err: any = new Error('address in use');
        err.code = 'EADDRINUSE';

        // Emit uncaughtException - handler should call process.exit(1)
        process.emit('uncaughtException', err);

        expect(exitSpy).toHaveBeenCalledWith(1);
        exitSpy.mockRestore();
    });

    test('crossfade-duration rejects invalid durations (400)', async () => {
        const { app } = require('../server');
        const res = await request(app).post('/api/mixer/crossfade-duration').send({ duration: 50 });
        expect(res.status).toBe(400);
        const res2 = await request(app).post('/api/mixer/crossfade-duration').send({ duration: 20000 });
        expect(res2.status).toBe(400);
    });

});
