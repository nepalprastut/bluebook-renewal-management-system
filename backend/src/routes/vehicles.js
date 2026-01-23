const express = require("express");
const router = express.Router();
const pool = require("../db");

// ADD VEHICLE
router.post("/", async (req, res) => {
  const { owner_id, plate_no, vehicle_type } = req.body;

  try {
    await pool.query(
      `INSERT INTO vehicles (owner_id, plate_no, vehicle_type)
       VALUES ($1, $2, $3)`,
      [owner_id, plate_no, vehicle_type]
    );
    res.json({ message: "Vehicle added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add vehicle" });
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

module.exports = router;
