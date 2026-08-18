'use strict';

const pool = require('../config/db');
const { NotFound } = require('../utils/errors');

module.exports = async function callPlanHandler(req, res, segments) {
  // POST /api/call-plans
  if (req.method === 'POST' && segments.length === 0) {
    const { id: userId } = req.user;
    const { call_list_id, doctor_id, visit_date, visit_time } = req.body;

    if (!call_list_id || !doctor_id || !visit_date) {
      return res.status(422).json({ status: 'error', message: 'call_list_id, doctor_id, and visit_date are required' });
    }

    const clResult = await pool.query(
      'SELECT id, month, status FROM call_lists WHERE id = $1',
      [call_list_id]
    );
    if (clResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list not found' });
    }
    const callList = clResult.rows[0];

    if (callList.status !== 'approved') {
      return res.status(422).json({ status: 'error', message: 'Call list must be approved to create a call plan' });
    }

    const doctorCheck = await pool.query(
      'SELECT id FROM call_list_doctors WHERE call_list_id = $1 AND master_customer_id = $2',
      [call_list_id, doctor_id]
    );
    if (doctorCheck.rows.length === 0) {
      return res.status(422).json({ status: 'error', message: 'Doctor is not in the specified call list' });
    }

    const visitMonth = visit_date.substring(0, 7); // "YYYY-MM"
    const callListDate = callList.month instanceof Date ? callList.month : new Date(callList.month);
    const callListMonth = callListDate.toISOString().substring(0, 7); // "YYYY-MM"
    if (visitMonth !== callListMonth) {
      return res.status(422).json({ status: 'error', message: 'visit_date must be within the call list month' });
    }

    const dupCheck = await pool.query(
      'SELECT id FROM call_plans WHERE user_id = $1 AND doctor_id = $2 AND visit_date = $3',
      [userId, doctor_id, visit_date]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'A call plan for this doctor on this date already exists' });
    }

    const insertResult = await pool.query(
      `INSERT INTO call_plans (call_list_id, user_id, doctor_id, visit_date, visit_time, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [call_list_id, userId, doctor_id, visit_date, visit_time || null]
    );

    return res.status(201).json({ status: 'success', data: insertResult.rows[0] });
  }

  // GET /api/call-plans
  if (req.method === 'GET' && segments.length === 0) {
    const { id: userId } = req.user;
    const result = await pool.query(
      'SELECT * FROM call_plans WHERE user_id = $1 ORDER BY visit_date ASC',
      [userId]
    );
    return res.json({ status: 'success', data: result.rows });
  }

  throw NotFound();
};
