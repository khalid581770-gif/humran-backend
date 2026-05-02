const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ متصل بـ PostgreSQL");
    client.release();
  } catch (err) {
    console.error("❌ فشل الاتصال:", err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };