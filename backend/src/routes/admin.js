const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require('bcrypt');
const saltRounds = 10;

// OFFICER REGISTRATION 
router.post("/register-officer", async (req, res) => {
  const { username, password, full_name, designation } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'OFFICER') RETURNING user_id`,
      [username, hashedPassword]
    );
    const userId = userResult.rows[0].user_id;
    await client.query(
      `INSERT INTO officers (user_id, full_name, designation)
       VALUES ($1, $2, $3)`,
      [userId, full_name, designation]
    );
    await client.query('COMMIT');
    res.json({ message: "Officer created successfully!" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Failed to create officer" });
  } finally {
    client.release();
  }
});

// SEARCH CITIZEN & VEHICLES 
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
    if (ownerRes.rows.length === 0) return res.status(404).json({ error: "Owner not found" });

    const owner = ownerRes.rows[0];
    const vehicleQuery = `
      SELECT v.vehicle_id, v.plate_no, v.vehicle_type, b.expiry_date, b.status
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

// DELETE VEHICLE (FIXED CHAIN DELETION)
router.delete("/delete-vehicle/:id", async (req, res) => {
  const vehicleId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Chain - Payment -> Renewal -> Bluebook -> Vehicle
    // Delete payments associated with renewals for this vehicle
    await client.query(`
      DELETE FROM payments WHERE renewal_id IN (
        SELECT r.renewal_id FROM renewals r
        JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
        WHERE b.vehicle_id = $1
      )`, [vehicleId]);

    // Delete renewals associated with bluebooks for this vehicle
    await client.query(`
      DELETE FROM renewals WHERE bluebook_id IN (
        SELECT bluebook_id FROM bluebooks WHERE vehicle_id = $1
      )`, [vehicleId]);

    // Delete bluebook
    await client.query("DELETE FROM bluebooks WHERE vehicle_id = $1", [vehicleId]);

    // Delete vehicle
    const result = await client.query("DELETE FROM vehicles WHERE vehicle_id = $1", [vehicleId]);
    
    await client.query('COMMIT');
    if (result.rowCount === 0) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ message: "Vehicle and all related history deleted" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Delete failed due to record dependencies" });
  } finally {
    client.release();
  }
});

// PRICE MANAGEMENT ---
router.get("/prices", async (req, res) => {
  try {
    // Note: If you haven't created this table yet, see SQL below
    const result = await pool.query("SELECT * FROM tax_prices ORDER BY vehicle_type ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database table 'tax_prices' missing." });
  }
});

router.post("/update-price", async (req, res) => {
  const { id, base_price } = req.body;
  try {
    // Parse values to integers to ensure DB compatibility
    const numericId = parseInt(id);
    const numericPrice = parseFloat(base_price);

    if (isNaN(numericId) || isNaN(numericPrice)) {
        return res.status(400).json({ error: "Invalid ID or Price format" });
    }

    await pool.query(
        "UPDATE tax_prices SET base_price = $1 WHERE id = $2", 
        [numericPrice, numericId]
    );
    
    res.json({ message: "Price updated" });
  } catch (err) {
    console.error(err); // Always log the error to see why it fails
    res.status(500).json({ error: "Update failed: " + err.message });
  }
});

// SYSTEM STATS
router.get("/stats", async (req, res) => {
  try {
    const totalRevenue = await pool.query("SELECT SUM(amount) FROM payments WHERE status = 'APPROVED'");
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'OWNER'");
    const pendingRenewals = await pool.query("SELECT COUNT(*) FROM payments WHERE status = 'PENDING'");

    res.json({
      revenue: parseFloat(totalRevenue.rows[0].sum) || 0,
      users: parseInt(totalUsers.rows[0].count) || 0,
      pending: parseInt(pendingRenewals.rows[0].count) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;