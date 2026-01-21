const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "project",
  password: "admin@123",
  port: 5432,
});

app.get("/test-db", async (req, res) => {
  const result = await pool.query("SELECT * FROM vehicles");
  res.json(result.rows);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.use(express.static(path.join(__dirname, "../../frontend")));