'use strict';

const pool = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const result = await pool.query(
      'SELECT id, name, role, region_id FROM users WHERE token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
