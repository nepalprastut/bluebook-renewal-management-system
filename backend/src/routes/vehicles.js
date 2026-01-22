const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "project",
  password: "admin@123",
  port: 5432,
});

/* GET all vehicles with owner + bluebook */
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT o.full_name, v.plate_no, v.vehicle_type,
             b.expiry_date, b.status
      FROM vehicle_owners o
      JOIN vehicles v ON o.owner_id = v.owner_id
      JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ADD new vehicle */
router.post("/", async (req, res) => {
  const { owner_id, plate_no, vehicle_type } = req.body;

  if (!owner_id || !plate_no) {
    return res.status(400).json({ error: "Owner ID and Plate No are required" });
  }

  try {
    const query = `
      INSERT INTO vehicles (owner_id, plate_no, vehicle_type)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [
      owner_id,
      plate_no,
      vehicle_type,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
