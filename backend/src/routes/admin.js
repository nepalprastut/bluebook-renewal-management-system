
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require('bcrypt');
const saltRounds = 10;

// NEW: ADMIN CREATE OFFICER
router.post("/register-officer", async (req, res) => {
  const { username, password, full_name, designation } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 1. Create User
    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'OFFICER') RETURNING user_id`,
      [username, hashedPassword]
    );
    const userId = userResult.rows[0].user_id;

    // 2. Create Officer Profile
    await client.query(
      `INSERT INTO officers (user_id, full_name, designation)
       VALUES ($1, $2, $3)`,
      [userId, full_name, designation]
    );

    await client.query('COMMIT');
    res.json({ message: "Officer created successfully!" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to create officer" });
  } finally {
    client.release();
  }
});

// ADMIN SEARCH: Find owner and their vehicles
router.get("/search-owner", async (req, res) => {
  const { username } = req.query;
  try {
    const ownerQuery = `
      SELECT u.user_id, o.full_name, o.citizenship_no, o.district, o.mobile_no
      FROM users u
      JOIN vehicle_owners o ON u.user_id = o.user_id
      WHERE u.username = $1 AND u.role = 'OWNER'
    `;
    const ownerRes = await pool.query(ownerQuery, [username]);

    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const owner = ownerRes.rows[0];
    const vehicleQuery = `
      SELECT v.plate_no, v.vehicle_type, b.expiry_date, b.status
      FROM vehicles v
      LEFT JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
      WHERE v.owner_id = (SELECT owner_id FROM vehicle_owners WHERE user_id = $1)
    `;
    const vehicleRes = await pool.query(vehicleQuery, [owner.user_id]);

    res.json({ profile: owner, vehicles: vehicleRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error during search" });
  }
});

// Other routes (delete user/vehicle) stay the same...

// delete user
router.delete("/users/:id", async (req, res) => {
  await pool.query("DELETE FROM users WHERE user_id=$1", [req.params.id]);
  res.json({ message: "User deleted" });
});

// delete vehicle
router.delete("/vehicles/:id", async (req, res) => {
  await pool.query("DELETE FROM vehicles WHERE vehicle_id=$1", [req.params.id]);
  res.json({ message: "Vehicle deleted" });
});


// view all payments
router.get("/payments", async (req, res) => {
  const result = await pool.query("SELECT * FROM payments");
  res.json(result.rows);
});

module.exports = router;