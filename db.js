const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});
pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
  process.exit(-1);
});

module.exports = pool;




