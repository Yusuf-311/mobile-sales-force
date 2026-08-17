'use strict';

const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// POST /api/call-plans
router.post('/', async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { call_list_id, doctor_id, visit_date, visit_time } = req.body;

    // 1. Validate required fields
    if (!call_list_id || !doctor_id || !visit_date) {
      return res.status(422).json({ status: 'error', message: 'call_list_id, doctor_id, and visit_date are required' });
    }

    // 2. Fetch call list
    const clResult = await pool.query(
      'SELECT id, month, status FROM call_lists WHERE id = $1',
      [call_list_id]
    );
    if (clResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list not found' });
    }
    const callList = clResult.rows[0];

    // 3. Must be approved
    if (callList.status !== 'approved') {
      return res.status(422).json({ status: 'error', message: 'Call list must be approved to create a call plan' });
    }

    // 4. Validate doctor_id is in call_list_doctors for this call_list_id
    const doctorCheck = await pool.query(
      'SELECT id FROM call_list_doctors WHERE call_list_id = $1 AND master_customer_id = $2',
      [call_list_id, doctor_id]
    );
    if (doctorCheck.rows.length === 0) {
      return res.status(422).json({ status: 'error', message: 'Doctor is not in the specified call list' });
    }

    // 5. Validate visit_date month matches call list month
    const visitMonth = visit_date.substring(0, 7); // "YYYY-MM"
    const callListDate = callList.month instanceof Date ? callList.month : new Date(callList.month);
    const callListMonth = callListDate.toISOString().substring(0, 7); // "YYYY-MM"
    if (visitMonth !== callListMonth) {
      return res.status(422).json({ status: 'error', message: 'visit_date must be within the call list month' });
    }

    // 6. Check for duplicate (user_id, doctor_id, visit_date)
    const dupCheck = await pool.query(
      'SELECT id FROM call_plans WHERE user_id = $1 AND doctor_id = $2 AND visit_date = $3',
      [userId, doctor_id, visit_date]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'A call plan for this doctor on this date already exists' });
    }

    // 7. Insert
    const insertResult = await pool.query(
      `INSERT INTO call_plans (call_list_id, user_id, doctor_id, visit_date, visit_time, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [call_list_id, userId, doctor_id, visit_date, visit_time || null]
    );

    return res.status(201).json({ status: 'success', data: insertResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/call-plans
router.get('/', async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      'SELECT * FROM call_plans WHERE user_id = $1 ORDER BY visit_date ASC',
      [userId]
    );
    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
