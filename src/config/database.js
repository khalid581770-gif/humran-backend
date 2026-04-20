// ============================================================
// الاتصال بقاعدة البيانات MySQL
// نستخدم Connection Pool لتحسين الأداء
// ============================================================
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false,
  host:               process.env.DB_HOST     || 'localhost',
  port:              11213,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'humran_training',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+03:00', // توقيت السعودية
});

// اختبار الاتصال عند بدء التشغيل
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

