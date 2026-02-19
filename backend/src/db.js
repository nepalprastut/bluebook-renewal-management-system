// const path = require('path');
// require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 

// const { Pool } = require("pg");

// // console.log("DB User:", process.env.DB_USER); // Debug line: Check if this prints 'postgres'

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: String(process.env.DB_PASSWORD), // Force string type
//   port: process.env.DB_PORT,
// });

// module.exports = pool; before deployment



const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 

const { Pool } = require("pg");

// Use DATABASE_URL if available (Production), otherwise use local config
const isProduction = process.env.NODE_ENV === "production" || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render provides this
  // Fallback to local config if DATABASE_URL is missing
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  password: process.env.DATABASE_URL ? undefined : String(process.env.DB_PASSWORD),
  port: process.env.DATABASE_URL ? undefined : process.env.DB_PORT,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;