const express = require("express");
const router = express.Router();
const pool = require("../db");

// 1️⃣ Get Pending Payments
router.get("/pending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.payment_id,
             v.plate_no,
             p.amount,
             p.payment_method,
             p.payment_date
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE p.status = 'PENDING'
      ORDER BY p.payment_date ASC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2️⃣ Approve Payment
router.post("/approve/:id", async (req, res) => {
  const paymentId = req.params.id;
  const officerId = req.body.officer_id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Mark payment approved
    await client.query(
      `UPDATE payments
       SET status = 'APPROVED',
           verified_by = $1,
           verified_at = CURRENT_TIMESTAMP
       WHERE payment_id = $2`,
      [officerId, paymentId]
    );

    // Activate Bluebook
    await client.query(`
      UPDATE bluebooks
      SET status = 'ACTIVE'
      WHERE bluebook_id = (
        SELECT r.bluebook_id
        FROM renewals r
        JOIN payments p ON r.renewal_id = p.renewal_id
        WHERE p.payment_id = $1
      )
    `, [paymentId]);

    await client.query("COMMIT");

    res.json({ message: "Payment Approved" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
