'use strict';

const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// GET /api/mcl
router.get('/mcl', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, specialization, address, phone FROM master_customers ORDER BY name'
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/products
router.get('/products', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category FROM products ORDER BY name'
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
