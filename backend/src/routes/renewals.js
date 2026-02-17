// // const express = require("express");
// // const router = express.Router();
// // const pool = require("../db");


// // /* GET renewal history */
// // router.get("/", async (req, res) => {
// //   try {
// //     const query = `
// //       SELECT v.plate_no,
// //              r.renewal_date,
// //              r.valid_from,
// //              r.valid_to,
// //              p.amount,
// //              p.payment_date
// //       FROM vehicles v
// //       JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
// //       JOIN renewals r ON b.bluebook_id = r.bluebook_id
// //       LEFT JOIN payments p ON r.renewal_id = p.renewal_id
// //       ORDER BY r.renewal_date DESC
// //     `;

// //     const result = await pool.query(query);
// //     res.json(result.rows);
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // module.exports = router;


// //new code:
// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // 1. GET renewal history (Filtered by user_id)
// router.get("/", async (req, res) => {
//   const { user_id } = req.query;
//   try {
//     const query = `
//       SELECT v.plate_no, r.renewal_date, r.valid_from, r.valid_to, 
//              p.amount, p.payment_date, p.payment_method
//       FROM users u
//       JOIN vehicle_owners o ON u.user_id = o.user_id
//       JOIN vehicles v ON o.owner_id = v.owner_id
//       JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
//       JOIN renewals r ON b.bluebook_id = r.bluebook_id
//       LEFT JOIN payments p ON r.renewal_id = p.renewal_id
//       WHERE u.user_id = $1
//       ORDER BY r.renewal_date DESC
//     `;
//     const result = await pool.query(query, [user_id]);
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 2. POST Perform Renewal Payment
// router.post("/pay", async (req, res) => {
//   const { bluebook_id, amount } = req.body;
//   const client = await pool.connect();

//   try {
//     await client.query('BEGIN');

//     // Insert into Renewals
//     const renewalRes = await client.query(
//       `INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount) 
//        VALUES ($1, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $2) 
//        RETURNING renewal_id`,
//       [bluebook_id, amount]
//     );

//     const renewalId = renewalRes.rows[0].renewal_id;

//     // Insert into Payments
//     await client.query(
//       `INSERT INTO payments (renewal_id, payment_date, amount, payment_method) 
//        VALUES ($1, CURRENT_DATE, $2, 'Online')`,
//       [renewalId, amount]
//     );

//     // Update Bluebook status and expiry
//     await client.query(
//       `UPDATE bluebooks 
//        SET status = 'ACTIVE', expiry_date = expiry_date + INTERVAL '1 year' 
//        WHERE bluebook_id = $1`,
//       [bluebook_id]
//     );

//     await client.query('COMMIT');
//     res.json({ message: "Renewal successful!" });
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error(err);
//     res.status(500).json({ error: "Transaction failed" });
//   } finally {
//     client.release();
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const pool = require("../db");


// ===============================
// 1️⃣ GET Renewal History
// ===============================
router.get("/", async (req, res) => {
  const { user_id } = req.query;

  try {
    const query = `
      SELECT v.plate_no,
             r.renewal_date,
             r.valid_from,
             r.valid_to,
             p.amount,
             p.payment_date,
             p.payment_method,
             p.status
      FROM users u
      JOIN vehicle_owners o ON u.user_id = o.user_id
      JOIN vehicles v ON o.owner_id = v.owner_id
      JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
      JOIN renewals r ON b.bluebook_id = r.bluebook_id
      LEFT JOIN payments p ON r.renewal_id = p.renewal_id
      WHERE u.user_id = $1
      ORDER BY r.renewal_date DESC
    `;

    const result = await pool.query(query, [user_id]);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch renewal history" });
  }
});


// ===============================
// Perform Renewal + Payment
// ===============================


router.post("/pay", async (req, res) => {
  const { bluebook_id, payment_method } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get vehicle type for calculation
    const vehicleRes = await client.query(
      `SELECT v.vehicle_type FROM bluebooks b
       JOIN vehicles v ON b.vehicle_id = v.vehicle_id
       WHERE b.bluebook_id = $1`,
      [bluebook_id]
    );

    if (vehicleRes.rows.length === 0) {
      throw new Error("Vehicle not found for this bluebook");
    }

    const vehicleType = vehicleRes.rows[0].vehicle_type;
    let amount = (vehicleType === "Car") ? 15000 : (vehicleType === "Bike") ? 3000 : 2500;

    const validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + 1);

    // 2. Insert Renewal (FIXED: Removed 'status' because it's not in your renewals table)
    const renewalRes = await client.query(
      `INSERT INTO renewals
       (bluebook_id, renewal_date, valid_from, valid_to, total_amount)
       VALUES ($1, CURRENT_DATE, CURRENT_DATE, $2, $3)
       RETURNING renewal_id`,
      [bluebook_id, validTo, amount] // Corrected: Match the columns in your schema
    );

    const renewalId = renewalRes.rows[0].renewal_id;

    // 3. Insert Payment (FIXED: Ensure status 'PENDING' is the LAST column)
    await client.query(
      `INSERT INTO payments
       (renewal_id, payment_date, amount, payment_method, status)
       VALUES ($1, CURRENT_DATE, $2, $3, 'PENDING')`,
      [renewalId, amount, payment_method || "Online"]
    );

    // 4. Update Bluebook expiry (FIXED: Added missing WHERE clause)
    await client.query(
      `UPDATE bluebooks SET expiry_date = $1 WHERE bluebook_id = $2`,
      [validTo, bluebook_id]
    );

    await client.query("COMMIT");
    res.json({ message: "Payment submitted. Waiting for officer verification." });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Transaction failed" });
  } finally {
    client.release();
  }
});



// Get Renewal Info (amount calculation)
router.get("/info/:id", async (req, res) => {
  const bluebook_id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT v.vehicle_type, v.plate_no
       FROM bluebooks b
       JOIN vehicles v ON b.vehicle_id = v.vehicle_id
       WHERE b.bluebook_id = $1`,
      [bluebook_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const type = result.rows[0].vehicle_type;
    let amount;

    if (type === "Car") amount = 3000;
    else if (type === "Bike") amount = 1500;
    else if (type === "Truck") amount = 5000;
    else amount = 2500;

    res.json({
      plate_no: result.rows[0].plate_no,
      vehicle_type: type,
      amount
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
