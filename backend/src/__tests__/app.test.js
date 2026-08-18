const request = require('supertest');
const app = require('../app');

jest.mock('../config/db');
const pool = require('../config/db');

beforeEach(() => {
  pool.query.mockReset();
});

test('GET /health returns ok without auth', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('GET /api/mcl requires auth', async () => {
  const res = await request(app).get('/api/mcl');
  expect(res.status).toBe(401);
});

test('GET /api/mcl returns master customers when authorized', async () => {
  // First call: authenticate -> return user
  // Second call: mcl query -> return rows
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 10, name: 'Alice', role: 'mr', region_id: 1 }] })
    .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. A' }, { id: 2, name: 'Dr. B' }] });

  const res = await request(app).get('/api/mcl').set('Authorization', 'Bearer token123');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('status', 'success');
  expect(Array.isArray(res.body.data)).toBe(true);
});
