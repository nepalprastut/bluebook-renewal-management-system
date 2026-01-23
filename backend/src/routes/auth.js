const express = require("express");
const router = express.Router();
const pool = require("../db");

/*
 OWNER REGISTRATION
*/
router.post("/register", async (req, res) => {
  const { username, password, full_name, citizenship_no, district, mobile_no } = req.body;

  try {
    // 1. Insert into users table
    const userResult = await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'OWNER')
       RETURNING user_id`,
      [username, password] // password stored as password_hash for demo
    );

    const userId = userResult.rows[0].user_id;

    // 2. Insert into vehicle_owners
    const ownerResult = await pool.query(
      `INSERT INTO vehicle_owners (user_id, full_name, citizenship_no, district, mobile_no)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING owner_id`,
      [userId, full_name, citizenship_no, district, mobile_no]
    );

    res.json({
      message: "Registration successful",
      owner_id: ownerResult.rows[0].owner_id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT user_id, role FROM users WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json(result.rows[0]); // { user_id, role }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
