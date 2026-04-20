// ============================================================
// سكريبت الإعداد الأول — يُشغَّل مرة واحدة فقط
// ينشئ المستخدم الافتراضي: عمي خالد / 1100
// ============================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

async function setup() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'humran_training',
    charset:  'utf8mb4',
  });

  console.log('✅ متصل بقاعدة البيانات');

  // تشفير كلمة المرور 1100
  const passwordHash = await bcrypt.hash('1100', 12);
  console.log('🔐 تم تشفير كلمة المرور');

  try {
    await conn.query(`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES (?, ?, ?, 'admin')
      ON DUPLICATE KEY UPDATE password_hash = ?
    `, ['عمي خالد', passwordHash, 'عمي خالد', passwordHash]);

    console.log('👤 تم إنشاء المستخدم الافتراضي:');
    console.log('   اسم المستخدم: عمي خالد');
    console.log('   كلمة المرور:  1100');
    console.log('\n🎉 الإعداد مكتمل! شغّل السيرفر بـ: npm run dev');
  } catch (err) {
    console.error('❌ خطأ:', err.message);
  }

  await conn.end();
}

setup();
