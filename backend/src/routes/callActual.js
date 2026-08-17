'use strict';

const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

/**
 * Resolves the visit type for a call actual.
 *
 * @param {number|null} planId     - ID of the call plan, or null for unplanned visits
 * @param {number}      userId     - ID of the authenticated MR user
 * @param {number}      doctorId   - ID of the doctor being visited
 * @param {string}      visitDate  - ISO date string for the visit date
 * @param {object}      db         - pg Pool/Client with a .query() method
 * @returns {Promise<'plan'|'unplan'|'non_target'>}
 * @throws {{ statusCode: number, message: string }} on validation failure
 */
async function resolveVisitType(planId, userId, doctorId, visitDate, db) {
  if (planId) {
    // plan branch: fetch the plan and validate ownership + doctor match
    const planResult = await db.query(
      'SELECT id, user_id, doctor_id FROM call_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      throw { statusCode: 404, message: 'Call plan not found' };
    }

    const plan = planResult.rows[0];

    if (plan.user_id !== userId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    if (plan.doctor_id !== doctorId) {
      throw { statusCode: 422, message: 'doctor_id does not match the call plan doctor' };
    }

    return 'plan';
  }

  // plan_id is null: check if doctor is in an approved call list for this month
  const unplanCheck = await db.query(
    `SELECT cld.id FROM call_list_doctors cld
     JOIN call_lists cl ON cl.id = cld.call_list_id
     WHERE cl.user_id = $1
       AND cl.status = 'approved'
       AND DATE_TRUNC('month', cl.month) = DATE_TRUNC('month', $2::date)
       AND cld.master_customer_id = $3`,
    [userId, visitDate, doctorId]
  );

  if (unplanCheck.rows.length > 0) {
    return 'unplan';
  }

  // Check if doctor exists in master_customers at all
  const mclCheck = await db.query(
    'SELECT id FROM master_customers WHERE id = $1',
    [doctorId]
  );

  if (mclCheck.rows.length > 0) {
    return 'non_target';
  }

  throw { statusCode: 422, message: 'Doctor not found in master customer list' };
}

// ─── POST /api/call-actuals ───────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const {
      plan_id,
      doctor_id,
      visit_date,
      check_in_time,
      check_out_time,
      photo_url,
      signature_url,
      detailing,
    } = req.body;

    // 1. Validate required fields
    if (!doctor_id || !visit_date) {
      return res.status(422).json({
        status: 'error',
        message: 'doctor_id and visit_date are required',
      });
    }

    // 2. Validate photo_url not empty
    if (!photo_url || photo_url.trim() === '') {
      return res.status(422).json({
        status: 'error',
        message: 'photo_url is required',
      });
    }

    // 3. Validate signature_url not empty
    if (!signature_url || signature_url.trim() === '') {
      return res.status(422).json({
        status: 'error',
        message: 'signature_url is required',
      });
    }

    // 4. Validate detailing array has at least 1 item
    if (!Array.isArray(detailing) || detailing.length === 0) {
      return res.status(422).json({
        status: 'error',
        message: 'detailing must be a non-empty array',
      });
    }

    // 5. Check for duplicate (user_id, doctor_id, visit_date)
    const dupCheck = await pool.query(
      'SELECT id FROM call_actuals WHERE user_id = $1 AND doctor_id = $2 AND visit_date = $3',
      [userId, doctor_id, visit_date]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'A call actual for this doctor on this date already exists',
      });
    }

    // 6. Resolve visit type
    let visit_type;
    try {
      visit_type = await resolveVisitType(plan_id || null, userId, doctor_id, visit_date, pool);
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
      }
      throw err;
    }

    // 7. INSERT into call_actuals
    const insertResult = await pool.query(
      `INSERT INTO call_actuals
         (user_id, plan_id, doctor_id, visit_type, visit_date, check_in_time, check_out_time,
          photo_url, signature_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_progress', NOW())
       RETURNING id`,
      [userId, plan_id || null, doctor_id, visit_type, visit_date, check_in_time || null, check_out_time || null, photo_url, signature_url]
    );

    const callActualId = insertResult.rows[0].id;

    // 8. INSERT each product into call_actual_products
    for (const item of detailing) {
      await pool.query(
        `INSERT INTO call_actual_products (call_actual_id, product_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [callActualId, item.product_id]
      );
    }

    // 9. Fetch the full record with products joined
    const caResult = await pool.query(
      `SELECT id, user_id, plan_id, doctor_id, visit_type, visit_date,
              check_in_time, check_out_time, photo_url, signature_url, status, created_at
         FROM call_actuals WHERE id = $1`,
      [callActualId]
    );

    const productsResult = await pool.query(
      `SELECT p.id, p.name, p.category
         FROM call_actual_products cap
         JOIN products p ON p.id = cap.product_id
        WHERE cap.call_actual_id = $1
        ORDER BY p.id`,
      [callActualId]
    );

    return res.status(201).json({
      status: 'success',
      data: {
        ...caResult.rows[0],
        products: productsResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/call-actuals ────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    const result = await pool.query(
      `SELECT id, user_id, plan_id, doctor_id, visit_type, visit_date,
              check_in_time, check_out_time, photo_url, signature_url, status, created_at
         FROM call_actuals
        WHERE user_id = $1
        ORDER BY visit_date DESC`,
      [userId]
    );

    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.resolveVisitType = resolveVisitType;
