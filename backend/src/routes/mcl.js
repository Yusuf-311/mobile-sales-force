'use strict';

const pool = require('../config/db');
const { NotFound } = require('../utils/errors');

module.exports = async function mclHandler(req, res, resource, segments) {
  if (req.method === 'GET' && resource === 'mcl' && segments.length === 0) {
    const result = await pool.query(
      'SELECT id, name, specialization, address, phone FROM master_customers ORDER BY name'
    );
    return res.json({ status: 'success', data: result.rows });
  }
  
  if (req.method === 'GET' && resource === 'products' && segments.length === 0) {
    const result = await pool.query(
      'SELECT id, name, category FROM products ORDER BY name'
    );
    return res.json({ status: 'success', data: result.rows });
  }

  throw NotFound();
};
