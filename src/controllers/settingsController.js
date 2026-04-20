// ============================================================
// Controller: الإعدادات العامة للموقع
// ============================================================
const { pool } = require('../config/database');
const path     = require('path');
const fs       = require('fs');

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));

    // لا نُرجع كلمات مرور SMTP
    delete settings.smtp_pass;
    res.json(settings);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const updates = req.body; // { key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = ?
      `, [key, value, value]);
    }

    res.json({ message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err) { next(err); }
}

// رفع الشعار
async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'لم يتم رفع أي صورة' });

    const logoPath = `/uploads/${req.file.filename}`;
    await pool.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('site_logo', ?) ON DUPLICATE KEY UPDATE setting_value=?",
      [logoPath, logoPath]
    );

    res.json({ message: 'تم رفع الشعار بنجاح', logo_url: logoPath });
  } catch (err) { next(err); }
}

// إدارة المستخدمين (admin فقط)
async function getUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, display_name, role, is_active, created_at FROM users'
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const bcrypt = require('bcryptjs');
    const { username, password, display_name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [username, hash, display_name || username, role || 'viewer']
    );

    res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) { next(err); }
}

module.exports = { getAll, update, uploadLogo, getUsers, createUser };
