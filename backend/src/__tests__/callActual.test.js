const { resolveVisitType } = require('../routes/callActual');

jest.mock('../config/db');
const pool = require('../config/db');

beforeEach(() => {
  pool.query.mockReset();
});

test('resolveVisitType: plan branch succeeds when plan matches user and doctor', async () => {
  const mockDb = { query: jest.fn() };
  mockDb.query.mockResolvedValueOnce({ rows: [{ id: 5, user_id: 2, doctor_id: 7 }] });

  const result = await resolveVisitType(5, 2, 7, '2026-08-01', mockDb);
  expect(result).toBe('plan');
});

test('resolveVisitType: plan branch 404 when plan not found', async () => {
  const mockDb = { query: jest.fn() };
  mockDb.query.mockResolvedValueOnce({ rows: [] });

  await expect(resolveVisitType(99, 2, 7, '2026-08-01', mockDb)).rejects.toEqual({ statusCode: 404, message: 'Call plan not found' });
});

test('resolveVisitType: unplan when doctor in approved call list', async () => {
  const mockDb = { query: jest.fn() };
  // unplan query returns one row
  mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

  const result = await resolveVisitType(null, 2, 7, '2026-08-15', mockDb);
  expect(result).toBe('unplan');
});

test('resolveVisitType: non_target when doctor exists but not in approved list', async () => {
  const mockDb = { query: jest.fn() };
  // first unplan check -> no rows
  mockDb.query.mockResolvedValueOnce({ rows: [] });
  // master_customers check -> exists
  mockDb.query.mockResolvedValueOnce({ rows: [{ id: 7 }] });

  const result = await resolveVisitType(null, 2, 7, '2026-08-15', mockDb);
  expect(result).toBe('non_target');
});

test('resolveVisitType: doctor not found throws 422', async () => {
  const mockDb = { query: jest.fn() };
  mockDb.query.mockResolvedValueOnce({ rows: [] });
  mockDb.query.mockResolvedValueOnce({ rows: [] });

  await expect(resolveVisitType(null, 2, 999, '2026-08-15', mockDb)).rejects.toEqual({ statusCode: 422, message: 'Doctor not found in master customer list' });
});
