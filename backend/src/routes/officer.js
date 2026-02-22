const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get List of Pending Payments
router.get("/pending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.payment_id, v.plate_no, v.vehicle_type, o.full_name, p.amount
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      JOIN vehicle_owners o ON v.owner_id = o.owner_id
      WHERE p.status = 'PENDING'
      ORDER BY p.payment_date ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Detailed View
router.get("/details/:paymentId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.payment_id, p.amount, v.plate_no, v.vehicle_type, v.engine_no, v.chassis_no,
             o.full_name, o.citizenship_no, o.mobile_no, b.expiry_date
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      JOIN vehicle_owners o ON v.owner_id = o.owner_id
      WHERE p.payment_id = $1
    `, [req.params.paymentId]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve
router.post("/approve/:id", async (req, res) => {
  const paymentId = req.params.id;
  const officerId = req.body.officer_id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE payments SET status = 'APPROVED', verified_by = $1, verified_at = NOW() WHERE payment_id = $2", [officerId, paymentId]);
    await client.query(`
        UPDATE bluebooks SET status = 'ACTIVE', 
        expiry_date = (SELECT r.valid_to FROM renewals r JOIN payments p ON r.renewal_id = p.renewal_id WHERE p.payment_id = $1)
        WHERE bluebook_id = (SELECT r.bluebook_id FROM renewals r JOIN payments p ON r.renewal_id = p.renewal_id WHERE p.payment_id = $1)
    `, [paymentId]);
    await client.query("COMMIT");
    res.json({ message: "Success" });
  } catch (err) { await client.query("ROLLBACK"); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

// Reject
router.post("/reject/:id", async (req, res) => {
  const { officer_id, reason } = req.body;
  try {
    await pool.query("UPDATE payments SET status = 'REJECTED', verified_by = $1, rejection_reason = $2 WHERE payment_id = $3", [officer_id, reason, req.params.id]);
    res.json({ message: "Rejected" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lookup Fix
router.get("/lookup", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT v.plate_no, v.vehicle_type, b.expiry_date, b.status 
            FROM vehicles v JOIN bluebooks b ON v.vehicle_id = b.vehicle_id 
            WHERE v.plate_no = $1`, [req.query.plate]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Lookup failed" }); }
});

module.exports = router;