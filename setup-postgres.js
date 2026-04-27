require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setup() {
  const passwordHash = await bcrypt.hash('1100', 12);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name VARCHAR(150),
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO users (username, password_hash, display_name, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, ['عمي خالد', passwordHash, 'عمي خالد', 'admin']);

  console.log('✅ تم إنشاء المستخدم');
  console.log('اسم المستخدم: عمي خالد');
  console.log('كلمة المرور: 1100');

  await pool.end();
}

setup().catch((err) => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});