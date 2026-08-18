const request = require('supertest');
const app = require('../app');

jest.mock('../config/db');
const pool = require('../config/db');

beforeEach(() => {
  pool.query.mockReset();
});

test('GET /api/call-lists returns MR own lists', async () => {
  // auth -> MR
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 2, name: 'MR A', role: 'mr', region_id: 1 }] })
    .mockResolvedValueOnce({ rows: [{ id: 11, user_id: 2, month: '2026-08-01' }] });

  const res = await request(app).get('/api/call-lists').set('Authorization', 'Bearer t');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('success');
});

test('POST /api/call-lists creates a new draft call list', async () => {
  // Sequence: auth, validate doctors, existing check, insert returning id, select call_list, select doctors
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 3, name: 'MR B', role: 'mr', region_id: 1 }] }) // auth
    .mockResolvedValueOnce({ rows: [{ id: 101 }, { id: 102 }] }) // validate doctor ids (2 rows)
    .mockResolvedValueOnce({ rows: [] }) // existing check
    .mockResolvedValueOnce({ rows: [{ id: 55 }] }) // insert RETURNING id
    .mockResolvedValueOnce({ rows: [] }) // insert doctor 1
    .mockResolvedValueOnce({ rows: [] }) // insert doctor 2
    .mockResolvedValueOnce({ rows: [{ id: 55, user_id: 3, month: '2026-08-01', status: 'draft' }] }) // select call_list
    .mockResolvedValueOnce({ rows: [{ id: 101, name: 'Dr X' }, { id: 102, name: 'Dr Y' }] }); // select doctors

  const body = { month: '2026-08', doctor_ids: [101, 102] };
  const res = await request(app).post('/api/call-lists').set('Authorization', 'Bearer t').send(body);
  expect(res.status).toBe(201);
  expect(res.body.status).toBe('success');
});
