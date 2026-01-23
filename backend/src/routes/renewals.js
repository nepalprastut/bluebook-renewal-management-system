const express = require("express");
const router = express.Router();
const pool = require("../db");


/* GET renewal history */
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT v.plate_no,
             r.renewal_date,
             r.valid_from,
             r.valid_to,
             p.amount,
             p.payment_date
      FROM vehicles v
      JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
      JOIN renewals r ON b.bluebook_id = r.bluebook_id
      LEFT JOIN payments p ON r.renewal_id = p.renewal_id
      ORDER BY r.renewal_date DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
