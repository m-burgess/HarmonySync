import request from 'supertest';
import { app } from '../server';

describe('Health endpoint', () => {
  it('returns ok status and service info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service');
    expect(res.body).toHaveProperty('activeJobs');
  });
});
