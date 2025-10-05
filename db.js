const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_wkKIQ5RGpxz8@ep-patient-haze-a8pglah9-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false },
});
pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
  process.exit(-1);
});

module.exports = pool;








