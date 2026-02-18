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
    // PostgreSQL handles this easily with INTERVAL
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
router.get("/", async (req, res) => {
  const result = await pool.query(`
    SELECT o.full_name, v.plate_no, v.vehicle_type, b.expiry_date, b.status
    FROM vehicle_owners o
    JOIN vehicles v ON o.owner_id = v.owner_id
    LEFT JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
  `);
  res.json(result.rows);
});

router.get("/owner/vehicles", async (req, res) => {
  const { user_id } = req.query;

  try {
    const result = await pool.query(`
      SELECT 
        o.full_name, 
        v.plate_no, 
        v.vehicle_type, 
        b.expiry_date, 
        b.status as bluebook_status,
        b.bluebook_id,
        -- This subquery finds the latest payment status for this bluebook
        (SELECT p.status 
         FROM payments p 
         JOIN renewals r ON p.renewal_id = r.renewal_id 
         WHERE r.bluebook_id = b.bluebook_id 
         ORDER BY p.payment_id DESC LIMIT 1) as payment_status
      FROM users u
      JOIN vehicle_owners o ON u.user_id = o.user_id
      JOIN vehicles v ON o.owner_id = v.owner_id
      LEFT JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
      WHERE u.user_id = $1
    `, [user_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

module.exports = router;
