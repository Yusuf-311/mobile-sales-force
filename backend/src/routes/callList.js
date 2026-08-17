'use strict';

const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps each supervisor role to the role of their direct subordinate.
 * @param {string} supervisorRole - 'dm' | 'rsm' | 'mm'
 * @returns {string|undefined} subordinate role, or undefined if not a supervisor
 */
function subordinateRole(supervisorRole) {
  const map = {
    dm:  'mr',
    rsm: 'dm',
    mm:  'rsm',
  };
  return map[supervisorRole];
}

/**
 * Returns true only when approverRole is the direct supervisor of ownerRole.
 * DM supervises MR, RSM supervises DM, MM supervises RSM.
 * @param {string} approverRole
 * @param {string} ownerRole
 * @returns {boolean}
 */
function isDirectSupervisor(approverRole, ownerRole) {
  const hierarchy = {
    dm:  'mr',
    rsm: 'dm',
    mm:  'rsm',
  };
  return hierarchy[approverRole] === ownerRole;
}

// ─── GET /api/call-lists ──────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    if (role === 'mr') {
      // MR sees only their own call lists
      const result = await pool.query(
        `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
           FROM call_lists
          WHERE user_id = $1
          ORDER BY created_at DESC`,
        [userId]
      );
      return res.json({ status: 'success', data: result.rows });
    }

    // DM / RSM / MM see submitted call lists of their direct subordinates
    const subRole = subordinateRole(role);
    if (!subRole) {
      // Should never happen given auth middleware; guard just in case
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const result = await pool.query(
      `SELECT cl.id, cl.user_id, cl.month, cl.status, cl.approved_by, cl.reason,
              cl.created_at, cl.updated_at
         FROM call_lists cl
         JOIN users u ON u.id = cl.user_id
        WHERE cl.status = 'submitted'
          AND u.role = $1
        ORDER BY cl.created_at DESC`,
      [subRole]
    );
    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/call-lists/:id ──────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const callListId = parseInt(req.params.id, 10);

    // 1. Fetch the call list
    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists
        WHERE id = $1`,
      [callListId]
    );

    if (clResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list not found' });
    }

    const callList = clResult.rows[0];

    // 2. Ownership / hierarchy check
    if (role === 'mr') {
      if (callList.user_id !== userId) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
    } else {
      // DM / RSM / MM — verify direct supervisor relationship
      const ownerResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [callList.user_id]
      );

      if (ownerResult.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Call list owner not found' });
      }

      const ownerRole = ownerResult.rows[0].role;
      if (!isDirectSupervisor(role, ownerRole)) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
    }

    // 3. Fetch associated doctors
    const doctorsResult = await pool.query(
      `SELECT mc.id, mc.name, mc.specialization, mc.address, mc.phone
         FROM call_list_doctors cld
         JOIN master_customers mc ON mc.id = cld.master_customer_id
        WHERE cld.call_list_id = $1
        ORDER BY mc.name`,
      [callListId]
    );

    // 4. Return combined response
    return res.json({
      status: 'success',
      data: {
        ...callList,
        doctors: doctorsResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/call-lists ─────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { month, doctor_ids } = req.body;

    // 1. Validate required fields
    if (!month || !Array.isArray(doctor_ids) || doctor_ids.length === 0) {
      return res.status(422).json({
        status: 'error',
        message: 'month and a non-empty doctor_ids array are required',
      });
    }

    // 2. Normalize month to DATE-compatible string (YYYY-MM-01)
    const monthDate = month + '-01';

    // 3. Validate all doctor_ids exist in master_customers
    const validCheckResult = await pool.query(
      `SELECT id FROM master_customers WHERE id = ANY($1::int[])`,
      [doctor_ids]
    );
    if (validCheckResult.rows.length !== doctor_ids.length) {
      return res.status(422).json({
        status: 'error',
        message: 'One or more doctor_ids are invalid',
      });
    }

    // 4. Check for existing call_list for this user + month
    const existingResult = await pool.query(
      `SELECT id, status FROM call_lists WHERE user_id = $1 AND month = $2`,
      [userId, monthDate]
    );

    let callListId;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      if (existing.status !== 'draft') {
        return res.status(409).json({
          status: 'error',
          message: 'A non-draft call list for this month already exists',
        });
      }

      // Draft exists — replace doctors
      callListId = existing.id;
      await pool.query(
        `DELETE FROM call_list_doctors WHERE call_list_id = $1`,
        [callListId]
      );
      await pool.query(
        `UPDATE call_lists SET updated_at = NOW() WHERE id = $1`,
        [callListId]
      );
    } else {
      // No existing — create new call list
      const insertResult = await pool.query(
        `INSERT INTO call_lists (user_id, month, status, created_at, updated_at)
         VALUES ($1, $2, 'draft', NOW(), NOW())
         RETURNING id`,
        [userId, monthDate]
      );
      callListId = insertResult.rows[0].id;
    }

    // 5. Insert doctors
    for (const doctorId of doctor_ids) {
      await pool.query(
        `INSERT INTO call_list_doctors (call_list_id, master_customer_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [callListId, doctorId]
      );
    }

    // 6. Fetch and return the updated call list with doctors
    const callListResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId]
    );

    const doctorsResult = await pool.query(
      `SELECT mc.id, mc.name, mc.specialization, mc.address, mc.phone
         FROM call_list_doctors cld
         JOIN master_customers mc ON mc.id = cld.master_customer_id
        WHERE cld.call_list_id = $1
        ORDER BY mc.name`,
      [callListId]
    );

    return res.status(201).json({
      status: 'success',
      data: {
        ...callListResult.rows[0],
        doctors: doctorsResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/call-lists/:id/submit ────────────────────────────────────────

router.patch('/:id/submit', async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const callListId = parseInt(req.params.id, 10);

    // 1. Fetch the call list
    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId]
    );

    if (clResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list not found' });
    }

    const callList = clResult.rows[0];

    // 2. Ownership check
    if (callList.user_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    // 3. Must be in draft status to submit
    if (callList.status !== 'draft') {
      return res.status(422).json({
        status: 'error',
        message: 'Only draft call lists can be submitted',
      });
    }

    // 4. Update status to submitted
    const updateResult = await pool.query(
      `UPDATE call_lists
          SET status = 'submitted', updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
      [callListId]
    );

    return res.status(200).json({
      status: 'success',
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/call-lists/:id/approve ───────────────────────────────────────

router.patch('/:id/approve', async (req, res, next) => {
  try {
    const { id: approverId, role: approverRole } = req.user;
    const callListId = parseInt(req.params.id, 10);

    // 1. Fetch the call list
    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId]
    );

    if (clResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list not found' });
    }

    const callList = clResult.rows[0];

    // 2. Fetch owner role from users table
    const ownerResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [callList.user_id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call list owner not found' });
    }

    const ownerRole = ownerResult.rows[0].role;

    // 3. Check direct supervisor relationship
    if (!isDirectSupervisor(approverRole, ownerRole)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    // 4. Only submitted call lists can be approved or rejected
    if (callList.status !== 'submitted') {
      return res.status(422).json({
        status: 'error',
        message: 'Only submitted call lists can be approved or rejected',
      });
    }

    const { status: newStatus, reason } = req.body;

    // 5. Validate rejection requires a non-empty reason
    if (newStatus === 'rejected') {
      if (!reason || reason.trim() === '') {
        return res.status(422).json({
          status: 'error',
          message: 'reason is required when rejecting a call list',
        });
      }

      // Rejected → reset to draft, store reason and approved_by
      const updateResult = await pool.query(
        `UPDATE call_lists
            SET status = 'draft', reason = $1, approved_by = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
        [reason.trim(), approverId, callListId]
      );

      return res.status(200).json({
        status: 'success',
        data: updateResult.rows[0],
      });
    }

    // 6. Approve
    const updateResult = await pool.query(
      `UPDATE call_lists
          SET status = 'approved', reason = NULL, approved_by = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
      [approverId, callListId]
    );

    return res.status(200).json({
      status: 'success',
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
