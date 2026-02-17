const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 

const { Pool } = require("pg");

console.log("DB User:", process.env.DB_USER); // Debug line: Check if this prints 'postgres'

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD), // Force string type
  port: process.env.DB_PORT,
});

module.exports = pool;