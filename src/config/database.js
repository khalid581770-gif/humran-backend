const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     11213,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'defaultdb',
  charset:  'utf8mb4',
  ssl:      { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    conn.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
