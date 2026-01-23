const express = require("express");
const router = express.Router();
const pool = require("../db");

// ADMIN SEARCH: Find owner and their vehicles by username
router.get("/search-owner", async (req, res) => {
  const { username } = req.query;

  try {
    // 1. Get Owner Profile
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

    // 2. Get their vehicles
    const vehicleQuery = `
      SELECT v.plate_no, v.vehicle_type, b.expiry_date, b.status
      FROM vehicles v
      LEFT JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
      WHERE v.owner_id = (SELECT owner_id FROM vehicle_owners WHERE user_id = $1)
    `;
    const vehicleRes = await pool.query(vehicleQuery, [owner.user_id]);

    res.json({
      profile: owner,
      vehicles: vehicleRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during search" });
  }
});

module.exports = router;