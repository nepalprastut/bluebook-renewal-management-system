const express = require("express");
const router = express.Router();
const pool = require("../db");

// ADD VEHICLE
router.post("/vehicles", async (req, res) => {
  const { plate_no, vehicle_type } = req.body;
  const user_id = req.query.user_id;

  try {
    const ownerRes = await pool.query(
      "SELECT owner_id FROM vehicle_owners WHERE user_id = $1",
      [user_id]
    );

    if (ownerRes.rows.length === 0) {
      return res.status(400).json({ error: "Owner not found" });
    }

    const owner_id = ownerRes.rows[0].owner_id;

    await pool.query(
      "INSERT INTO vehicles (owner_id, plate_no, vehicle_type) VALUES ($1, $2, $3)",
      [owner_id, plate_no, vehicle_type]
    );

    res.json({ message: "Vehicle added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
        b.status
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
