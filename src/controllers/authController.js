// ==========================================
// Controller: المصادقة وتسجيل الدخول
// ==========================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ==========================================
// POST /api/auth/login
// ==========================================
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    // ✅ PostgreSQL query
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const user = rows[0];

    // تحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // إنشاء توكن
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// GET /api/auth/me
// ==========================================
async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, display_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// ==========================================
// PUT /api/auth/change-password
// ==========================================
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = rows[0];

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  me,
  changePassword,
};