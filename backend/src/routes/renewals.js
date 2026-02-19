const express = require("express");
const router = express.Router();
const pool = require("../db");

// 1. RENEWAL HISTORY PAGE

router.get("/", async (req, res) => {
  const { user_id } = req.query;
  
  // Guard against string "null" or missing ID
  if (!user_id || user_id === "null" || isNaN(parseInt(user_id))) {
    return res.status(400).json({ error: "A valid User ID is required" });
  }

  try {
    const query = `
      SELECT v.plate_no, r.renewal_date, p.amount, p.status, 
             p.rejection_reason, b.bluebook_id, p.payment_date, p.payment_method
      FROM payments p
      JOIN renewals r ON p.renewal_id = r.renewal_id
      JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE p.payment_id IN (
          SELECT MAX(p2.payment_id)
          FROM payments p2
          JOIN renewals r2 ON p2.renewal_id = r2.renewal_id
          JOIN bluebooks b2 ON r2.bluebook_id = b2.bluebook_id
          JOIN vehicles v2 ON b2.vehicle_id = v2.vehicle_id
          JOIN vehicle_owners o2 ON v2.owner_id = o2.owner_id
          WHERE o2.user_id = $1
          GROUP BY v2.vehicle_id
      )
      ORDER BY p.payment_date DESC`;

    const result = await pool.query(query, [parseInt(user_id)]);
    res.json(result.rows);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});


// PAYMENT SUBMISSION
router.post("/pay", async (req, res) => {
  const { bluebook_id, payment_method } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch current price and current expiry from your specific tables
    const vehicleData = await client.query(
      `SELECT tp.base_price, b.expiry_date 
       FROM bluebooks b
       JOIN vehicles v ON b.vehicle_id = v.vehicle_id
       JOIN tax_prices tp ON v.vehicle_type = tp.vehicle_type
       WHERE b.bluebook_id = $1::int`,
      [parseInt(bluebook_id)]
    );

    if (vehicleData.rows.length === 0) {
        throw new Error("Vehicle tax configuration or Bluebook not found");
    }
    
    const amount = vehicleData.rows[0].base_price;
    const currentExpiry = new Date(vehicleData.rows[0].expiry_date);
    
    // Calculate dates for the 'renewals' table
    const validFrom = new Date(currentExpiry);
    validFrom.setDate(validFrom.getDate() + 1);

    const validTo = new Date(currentExpiry);
    validTo.setFullYear(validTo.getFullYear() + 1);

    // Insert into Renewals table
    const renewalRes = await client.query(
      `INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount) 
       VALUES ($1, CURRENT_DATE, $2, $3, $4) RETURNING renewal_id`,
      [parseInt(bluebook_id), validFrom, validTo, amount]
    );
    const renewalId = renewalRes.rows[0].renewal_id;

    // Insert into Payments table
    await client.query(
      `INSERT INTO payments (renewal_id, payment_date, amount, payment_method, status) 
       VALUES ($1, CURRENT_DATE, $2, $3, 'PENDING')`,
      [renewalId, amount, payment_method]
    );

    await client.query('COMMIT');
    res.json({ message: "Payment submitted successfully" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Payment Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PAYMENT PAGE INFO
router.get("/info/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id === "null") return res.status(400).json({ error: "Invalid ID" });

  try {
    const result = await pool.query(
      `SELECT v.plate_no, v.vehicle_type, tp.base_price as amount
       FROM bluebooks b 
       JOIN vehicles v ON b.vehicle_id = v.vehicle_id 
       JOIN tax_prices tp ON v.vehicle_type = tp.vehicle_type 
       WHERE b.bluebook_id = $1::int`, 
      [parseInt(id)]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Vehicle or Tax Rate not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Info Error:", err.message);
    res.status(500).json({ error: "Server error loading vehicle info" });
  }
});

module.exports = router;