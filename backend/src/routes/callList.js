"use strict";

const pool = require("../config/db");
const { NotFound } = require("../utils/errors");

function subordinateRole(supervisorRole) {
  const map = {
    dm: "mr",
    rsm: "dm",
    mm: "rsm",
  };
  return map[supervisorRole];
}

function isDirectSupervisor(approverRole, ownerRole) {
  const hierarchy = {
    dm: "mr",
    rsm: "dm",
    mm: "rsm",
  };
  return hierarchy[approverRole] === ownerRole;
}

module.exports = async function callListHandler(req, res, segments) {
  // GET /api/call-lists
  if (req.method === "GET" && segments.length === 0) {
    const { id: userId, role } = req.user;

    if (role === "mr") {
      const result = await pool.query(
        `SELECT cl.id, cl.user_id, cl.month, cl.status, cl.approved_by, cl.reason,
                cl.created_at, cl.updated_at,
                (SELECT COUNT(*) FROM call_list_doctors cld WHERE cld.call_list_id = cl.id) AS doctor_count
           FROM call_lists cl
          WHERE cl.user_id = $1
          ORDER BY cl.created_at DESC`,
        [userId],
      );
      return res.json({ status: "success", data: result.rows });
    }

    const subRole = subordinateRole(role);
    if (!subRole) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const result = await pool.query(
      `SELECT cl.id, cl.user_id, cl.month, cl.status, cl.approved_by, cl.reason,
              cl.created_at, cl.updated_at,
              u.name AS user_name,
              (SELECT COUNT(*) FROM call_list_doctors cld WHERE cld.call_list_id = cl.id) AS doctor_count
         FROM call_lists cl
         JOIN users u ON u.id = cl.user_id
        WHERE cl.status IN ('submitted', 'pending_approval')
          AND u.role = $1
        ORDER BY cl.created_at DESC`,
      [subRole],
    );
    return res.json({ status: "success", data: result.rows });
  }

  // POST /api/call-lists
  if (req.method === "POST" && segments.length === 0) {
    const { id: userId } = req.user;
    const { month, doctor_ids } = req.body;

    if (!month || !Array.isArray(doctor_ids) || doctor_ids.length === 0) {
      return res.status(422).json({
        status: "error",
        message: "month and a non-empty doctor_ids array are required",
      });
    }

    const monthDate = month + "-01";

    const validCheckResult = await pool.query(
      `SELECT id FROM master_customers WHERE id = ANY($1::int[])`,
      [doctor_ids],
    );
    if (validCheckResult.rows.length !== doctor_ids.length) {
      return res.status(422).json({
        status: "error",
        message: "One or more doctor_ids are invalid",
      });
    }

    const existingResult = await pool.query(
      `SELECT id, status FROM call_lists WHERE user_id = $1 AND month = $2`,
      [userId, monthDate],
    );

    let callListId;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      if (existing.status !== "draft") {
        return res.status(409).json({
          status: "error",
          message: "A non-draft call list for this month already exists",
        });
      }

      callListId = existing.id;
      await pool.query(
        `DELETE FROM call_list_doctors WHERE call_list_id = $1`,
        [callListId],
      );
      await pool.query(
        `UPDATE call_lists SET updated_at = NOW() WHERE id = $1`,
        [callListId],
      );
    } else {
      const insertResult = await pool.query(
        `INSERT INTO call_lists (user_id, month, status, created_at, updated_at)
         VALUES ($1, $2, 'draft', NOW(), NOW())
         RETURNING id`,
        [userId, monthDate],
      );
      callListId = insertResult.rows[0].id;
    }

    for (const doctorId of doctor_ids) {
      await pool.query(
        `INSERT INTO call_list_doctors (call_list_id, master_customer_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [callListId, doctorId],
      );
    }

    const callListResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId],
    );

    const doctorsResult = await pool.query(
      `SELECT mc.id, mc.name, mc.specialization, mc.address, mc.phone
         FROM call_list_doctors cld
         JOIN master_customers mc ON mc.id = cld.master_customer_id
        WHERE cld.call_list_id = $1
        ORDER BY mc.name`,
      [callListId],
    );

    return res.status(201).json({
      status: "success",
      data: {
        ...callListResult.rows[0],
        doctors: doctorsResult.rows,
      },
    });
  }

  // GET /api/call-lists/:id
  if (req.method === "GET" && segments.length === 1) {
    const { id: userId, role } = req.user;
    const callListId = parseInt(segments[0], 10);

    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists
        WHERE id = $1`,
      [callListId],
    );

    if (clResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Call list not found" });
    }

    const callList = clResult.rows[0];

    if (role === "mr") {
      if (callList.user_id !== userId) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const ownerResult = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [callList.user_id],
      );
      if (ownerResult.rows.length === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "Call list owner not found" });
      }
      const ownerRole = ownerResult.rows[0].role;
      if (!isDirectSupervisor(role, ownerRole)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const doctorsResult = await pool.query(
      `SELECT mc.id, mc.name, mc.specialization, mc.address, mc.phone
         FROM call_list_doctors cld
         JOIN master_customers mc ON mc.id = cld.master_customer_id
        WHERE cld.call_list_id = $1
        ORDER BY mc.name`,
      [callListId],
    );

    return res.json({
      status: "success",
      data: {
        ...callList,
        doctors: doctorsResult.rows,
      },
    });
  }

  // PATCH /api/call-lists/:id/submit
  if (
    req.method === "PATCH" &&
    segments.length === 2 &&
    segments[1] === "submit"
  ) {
    const { id: userId } = req.user;
    const callListId = parseInt(segments[0], 10);

    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId],
    );

    if (clResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Call list not found" });
    }

    const callList = clResult.rows[0];

    if (callList.user_id !== userId) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    if (callList.status !== "draft") {
      return res.status(422).json({
        status: "error",
        message: "Only draft call lists can be submitted",
      });
    }

    const updateResult = await pool.query(
      `UPDATE call_lists
          SET status = 'submitted', updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
      [callListId],
    );

    return res.status(200).json({
      status: "success",
      data: updateResult.rows[0],
    });
  }

  // PATCH /api/call-lists/:id/approve
  if (
    req.method === "PATCH" &&
    segments.length === 2 &&
    segments[1] === "approve"
  ) {
    const { id: approverId, role: approverRole } = req.user;
    const callListId = parseInt(segments[0], 10);

    const clResult = await pool.query(
      `SELECT id, user_id, month, status, approved_by, reason, created_at, updated_at
         FROM call_lists WHERE id = $1`,
      [callListId],
    );

    if (clResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Call list not found" });
    }

    const callList = clResult.rows[0];

    const ownerResult = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [callList.user_id],
    );
    if (ownerResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Call list owner not found" });
    }

    const ownerRole = ownerResult.rows[0].role;

    if (!isDirectSupervisor(approverRole, ownerRole)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    if (!["submitted", "pending_approval"].includes(callList.status)) {
      return res.status(422).json({
        status: "error",
        message:
          "Only submitted or pending_approval call lists can be approved or rejected",
      });
    }

    const { status: newStatus, reason } = req.body;

    if (newStatus === "rejected") {
      if (!reason || reason.trim() === "") {
        return res.status(422).json({
          status: "error",
          message: "reason is required when rejecting a call list",
        });
      }

      const updateResult = await pool.query(
        `UPDATE call_lists
            SET status = 'draft', reason = $1, approved_by = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
        [reason.trim(), approverId, callListId],
      );

      return res.status(200).json({
        status: "success",
        data: updateResult.rows[0],
      });
    }

    const updateResult = await pool.query(
      `UPDATE call_lists
          SET status = 'approved', reason = NULL, approved_by = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, user_id, month, status, approved_by, reason, created_at, updated_at`,
      [approverId, callListId],
    );

    return res.status(200).json({
      status: "success",
      data: updateResult.rows[0],
    });
  }

  throw NotFound();
};
