const express = require("express");
const router = express.Router();
const pool = require("../db");



router.post("/vehicles", async (req, res) => {
  const { plate_no, vehicle_type, engine_no, chassis_no, last_renewal_date } = req.body;
  const user_id = req.query.user_id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ownerRes = await client.query(
      "SELECT owner_id FROM vehicle_owners WHERE user_id = $1",
      [user_id]
    );
    if (ownerRes.rows.length === 0) throw new Error("Owner profile not found");
    const owner_id = ownerRes.rows[0].owner_id;

    // Insert Vehicle
    const vehicleRes = await client.query(
      `INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no) 
       VALUES ($1, $2, $3, $4, $5) RETURNING vehicle_id`,
      [owner_id, plate_no, vehicle_type, engine_no, chassis_no]
    );
    const vehicleId = vehicleRes.rows[0].vehicle_id;

    // CALCULATE EXPIRY: last_renewal_date + 1 year
    await client.query(
      `INSERT INTO bluebooks (vehicle_id, last_renewal_date, issue_date, expiry_date, status) 
       VALUES ($1, $2, $2, ($2::date + INTERVAL '1 year'), 
       CASE WHEN ($2::date + INTERVAL '1 year') < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END)`,
      [vehicleId, last_renewal_date]
    );

    await client.query('COMMIT');
    res.json({ message: "Vehicle added and status calculated successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});



// LIST VEHICLES
router.get("/owner/vehicles", async (req, res) => {
  const { user_id } = req.query;

  // Stop the "null" string from reaching the DB
  if (!user_id || user_id === "null" || user_id === "undefined") {
    // console.error("Blocked invalid user_id query");
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const result = await pool.query(
      `SELECT v.*, b.bluebook_id, b.expiry_date, 
       (SELECT p.status FROM payments p 
        JOIN renewals r ON p.renewal_id = r.renewal_id 
        WHERE r.bluebook_id = b.bluebook_id 
        ORDER BY p.payment_id DESC LIMIT 1) as latest_payment_status
       FROM vehicles v
       JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
       JOIN vehicle_owners o ON v.owner_id = o.owner_id
       WHERE o.user_id = $1::int`, // Cast to int
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database Error in vehicles.js:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
