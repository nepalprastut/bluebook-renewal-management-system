const express = require("express");
const cors = require("cors");
const pool = require("./db");
const path = require("path");

const app = express();
app.use(express.json());

app.get("/test-db", async (req, res) => {
  const result = await pool.query("SELECT * FROM vehicles");
  res.json(result.rows);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.use(express.static(path.join(__dirname, "../../frontend")));

const vehicleRoutes = require("./routes/vehicles");
app.use("/api/vehicles", vehicleRoutes);

const renewalRoutes = require("./routes/renewals");
app.use("/api/renewals", renewalRoutes);

const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);
