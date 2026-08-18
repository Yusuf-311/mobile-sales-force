'use strict';

const pool = require('../config/db');
const { Unauthorized } = require('../utils/errors');

async function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Unauthorized();
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw Unauthorized();
  }
  const result = await pool.query(
    'SELECT id, name, role, region_id FROM users WHERE token = $1',
    [token]
  );
  if (result.rows.length === 0) {
    throw Unauthorized();
  }
  req.user = result.rows[0];
}

module.exports = { authenticate };
