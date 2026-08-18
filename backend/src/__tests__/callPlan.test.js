const request = require('supertest');
const app = require('../app');

jest.mock('../config/db');
const pool = require('../config/db');

beforeEach(() => {
  pool.query.mockReset();
});

test('POST /api/call-plans fails when call list not found', async () => {
  // auth, then call list lookup returns empty
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 4, name: 'MR C', role: 'mr', region_id: 1 }] })
    .mockResolvedValueOnce({ rows: [] });

  const body = { call_list_id: 999, doctor_id: 7, visit_date: '2026-08-10' };
  const res = await request(app).post('/api/call-plans').set('Authorization', 'Bearer t').send(body);
  expect(res.status).toBe(404);
});
