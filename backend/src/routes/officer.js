const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get List of Pending Payments
router.get("/pending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.payment_id, v.plate_no, v.vehicle_type, o.full_name, p.amount, 
             p.payment_method, p.payment_date
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      JOIN vehicle_owners o ON v.owner_id = o.owner_id
      WHERE p.status = 'PENDING'
      ORDER BY p.payment_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Detailed View for Inspection
router.get("/details/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.payment_id, p.amount, p.payment_method, p.payment_date,
             v.plate_no, v.vehicle_type, v.engine_no, v.chassis_no,
             o.full_name, o.citizenship_no, o.mobile_no,
             b.expiry_date as current_expiry
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      JOIN vehicle_owners o ON v.owner_id = o.owner_id
      WHERE p.payment_id = $1
    `, [paymentId]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve Payment and Update Bluebook
router.post("/approve/:id", async (req, res) => {
  const paymentId = req.params.id;
  const officerId = req.body.officer_id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update Payment Status
    await client.query(
      "UPDATE payments SET status = 'APPROVED', verified_by = $1, verified_at = CURRENT_TIMESTAMP WHERE payment_id = $2",
      [officerId, paymentId]
    );

    // Update Bluebook table using subqueries to get the correct valid_to date
await client.query(`
  UPDATE bluebooks 
  SET status = 'ACTIVE', 
      expiry_date = (
        SELECT r.valid_to 
        FROM renewals r 
        JOIN payments p ON r.renewal_id = p.renewal_id 
        WHERE p.payment_id = $1
      )
  WHERE bluebook_id = (
    SELECT r.bluebook_id 
    FROM renewals r 
    JOIN payments p ON r.renewal_id = p.renewal_id 
    WHERE p.payment_id = $1
  )
`, [paymentId]);

    await client.query("COMMIT");
    res.json({ message: "Approved and Bluebook Updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Reject Payment with Reason
router.post("/reject/:id", async (req, res) => {
  const paymentId = req.params.id;
  const { officer_id, reason } = req.body;
  try {
    await pool.query(
      `UPDATE payments SET status = 'REJECTED', verified_by = $1, verified_at = CURRENT_TIMESTAMP, rejection_reason = $2 WHERE payment_id = $3`,
      [officer_id, reason, paymentId]
    );
    res.json({ message: "Renewal Rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pending-count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM payments WHERE status = 'PENDING'");
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;