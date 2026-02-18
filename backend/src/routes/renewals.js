const express = require("express");
const router = express.Router();
const pool = require("../db");

// ============================================================
// 1. RENEWAL HISTORY PAGE
// Handles: renewals.html
// Fix: Shows only the latest attempt per vehicle using MAX ID
// ============================================================
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  
  // FIX: Guard against string "null" or missing ID
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

// ============================================================
// 2. PAYMENT SUBMISSION
// Handles: payment.html (The "Pay Now" button)
// Fix: Prevents duplicate pending requests and enforces integer ID
// ============================================================
router.post("/pay", async (req, res) => {
  const { bluebook_id, payment_method } = req.body;
  
  // Guard against null/invalid IDs
  if (!bluebook_id || bluebook_id === "null") {
    return res.status(400).json({ error: "Invalid Bluebook ID provided." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Guard: Don't allow a second payment if one is already 'PENDING'
    const pendingCheck = await client.query(`
        SELECT p.payment_id FROM payments p
        JOIN renewals r ON p.renewal_id = r.renewal_id
        WHERE r.bluebook_id = $1 AND p.status = 'PENDING'
    `, [bluebook_id]);

    if (pendingCheck.rows.length > 0) {
      throw new Error("A renewal request for this vehicle is already pending.");
    }

    // Get info for tax calculation
    const vehicleRes = await client.query(
      `SELECT v.vehicle_type FROM bluebooks b JOIN vehicles v ON b.vehicle_id = v.vehicle_id WHERE b.bluebook_id = $1`,
      [bluebook_id]
    );
    
    if (vehicleRes.rows.length === 0) throw new Error("Vehicle not found.");

    const type = vehicleRes.rows[0].vehicle_type;
    let amount = (type === "Car") ? 15000 : (type === "Bike") ? 3000 : (type === "Scooter") ? 2500 : (type === "Truck") ? 25000 : 5000;

    const validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + 1);

    // Create the Renewal record
    const renewalRes = await client.query(
      `INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount) 
       VALUES ($1, CURRENT_DATE, CURRENT_DATE, $2, $3) RETURNING renewal_id`,
      [bluebook_id, validTo, amount]
    );

    // Create the Payment record (Status starts as PENDING)
    await client.query(
      `INSERT INTO payments (renewal_id, payment_date, amount, payment_method, status) 
       VALUES ($1, CURRENT_DATE, $2, $3, 'PENDING')`,
      [renewalRes.rows[0].renewal_id, amount, payment_method || "Online"]
    );

    await client.query("COMMIT");
    res.json({ message: "Payment submitted! Waiting for officer verification." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Payment Submission Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 3. PAYMENT PAGE INFO
// Handles: payment.html (Loading vehicle details before paying)
// Fix: Added explicit casting to INT to prevent syntax errors
// ============================================================
router.get("/info/:id", async (req, res) => {
  const { id } = req.params;

  // Final Guard: If the ID is missing or the literal string "null"
  if (!id || id === "null" || id === "undefined") {
    return res.status(400).json({ error: "Bluebook ID is missing or invalid." });
  }

  try {
    const result = await pool.query(
      `SELECT v.vehicle_type, v.plate_no 
       FROM bluebooks b 
       JOIN vehicles v ON b.vehicle_id = v.vehicle_id 
       WHERE b.bluebook_id = $1::int`, // Explicitly cast to integer
      [id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Vehicle not found" });
    
    const type = result.rows[0].vehicle_type;
    // Calculation logic matching the /pay route
    let amount = (type === "Car") ? 15000 : (type === "Bike") ? 3000 : (type === "Scooter") ? 2500 : (type === "Truck") ? 25000 : 5000;

    res.json({ 
      plate_no: result.rows[0].plate_no, 
      vehicle_type: type, 
      amount: amount 
    });
  } catch (err) {
    console.error("Info Fetch Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;