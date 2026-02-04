import request from 'supertest';
import { app } from '../../harmonysync-video-service/server';

describe('Shutdown endpoint', () => {
  it('accepts shutdown when no token is configured', async () => {
    const res = await request(app).post('/api/shutdown');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
