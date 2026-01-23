const express = require("express");
const cors = require("cors");
const pool = require("./db");
const path = require("path");

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json());

// -------------------- STATIC FRONTEND --------------------
app.use(express.static(path.join(__dirname, "../../frontend")));

// -------------------- TEST DB ROUTE --------------------
app.get("/test-db", async (req, res) => {
  const result = await pool.query("SELECT * FROM vehicles");
  res.json(result.rows);
});

// -------------------- API ROUTES --------------------
const vehicleRoutes = require("./routes/vehicles");
app.use("/api", vehicleRoutes);

const renewalRoutes = require("./routes/renewals");
app.use("/api", renewalRoutes);

const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);

// -------------------- START SERVER --------------------
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
