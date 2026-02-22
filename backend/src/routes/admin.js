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

// IMPROVED SEARCH: Finds Owners AND Officers
router.get("/search-any-user", async (req, res) => {
  const { query } = req.query; // Search by username or part of name
  try {
    const searchSQL = `
      SELECT u.user_id, u.username, u.role, 
             COALESCE(o.full_name, off.full_name) as full_name,
             o.mobile_no, off.designation
      FROM users u
      LEFT JOIN vehicle_owners o ON u.user_id = o.user_id
      LEFT JOIN officers off ON u.user_id = off.user_id
      WHERE u.username ILIKE $1 OR o.full_name ILIKE $1 OR off.full_name ILIKE $1
    `;
    const result = await pool.query(searchSQL, [`%${query}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// DELETE USER (Safe Transaction)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Delete profiles first
        await client.query('DELETE FROM officers WHERE user_id = $1', [id]);
        
        // 2. Before deleting owner, we must delete their vehicle links
        // (Assuming you want to wipe their data entirely)
        await client.query('DELETE FROM vehicle_owners WHERE user_id = $1', [id]);
        
        // 3. Delete from core users table
        await client.query('DELETE FROM users WHERE user_id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: "User account and associated profiles deleted." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Deletion failed due to database dependencies." });
    } finally {
        client.release();
    }
});

// DELETE VEHICLE
router.delete("/delete-vehicle/:id", async (req, res) => {
  const vehicleId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM payments WHERE renewal_id IN (SELECT r.renewal_id FROM renewals r JOIN bluebooks b ON r.bluebook_id = b.bluebook_id WHERE b.vehicle_id = $1)`, [vehicleId]);
    await client.query(`DELETE FROM renewals WHERE bluebook_id IN (SELECT bluebook_id FROM bluebooks WHERE vehicle_id = $1)`, [vehicleId]);
    await client.query("DELETE FROM bluebooks WHERE vehicle_id = $1", [vehicleId]);
    const result = await client.query("DELETE FROM vehicles WHERE vehicle_id = $1", [vehicleId]);
    await client.query('COMMIT');
    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Delete failed" });
  } finally {
    client.release();
  }
});

// SYSTEM STATS
router.get("/stats", async (req, res) => {
  try {
    const revenue = await pool.query("SELECT SUM(amount) FROM payments WHERE status = 'APPROVED'");
    const users = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'OWNER'");
    const officers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'OFFICER'");
    const pending = await pool.query("SELECT COUNT(*) FROM payments WHERE status = 'PENDING'");

    res.json({
      revenue: parseFloat(revenue.rows[0].sum) || 0,
      users: parseInt(users.rows[0].count) || 0,
      officers: parseInt(officers.rows[0].count) || 0,
      pending: parseInt(pending.rows[0].count) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;