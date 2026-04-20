// ============================================================
// Controller: إرسال البريد الإلكتروني وسجل الرسائل
// ============================================================
const nodemailer = require('nodemailer');
const { pool }   = require('../config/database');

// نبني الـ Transporter بناءً على إعدادات قاعدة البيانات
async function getTransporter() {
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'smtp%'"
  );
  const cfg = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));

  return nodemailer.createTransport({
    host: cfg.smtp_host || process.env.SMTP_HOST,
    port: parseInt(cfg.smtp_port || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: cfg.smtp_user || process.env.SMTP_USER,
      pass: cfg.smtp_pass || process.env.SMTP_PASS,
    },
  });
}

// ─────────────────────────────────────────
// POST /api/messages/send
// ─────────────────────────────────────────
async function send(req, res, next) {
  try {
    const { to_email, subject, body } = req.body;
    if (!to_email || !subject || !body) {
      return res.status(400).json({ message: 'البريد والموضوع والمحتوى مطلوبة' });
    }

    // نحفظ الرسالة أولاً كمسودة
    const [result] = await pool.query(`
      INSERT INTO messages (sender_id, to_email, subject, body, status)
      VALUES (?, ?, ?, ?, 'مُسودة')
    `, [req.user.id, to_email, subject, body]);

    try {
      const transporter = await getTransporter();
      const [settings]  = await pool.query(
        "SELECT setting_value FROM settings WHERE setting_key = 'smtp_from_name'"
      );
      const fromName = settings[0]?.setting_value || 'م. عايض آل حمران';

      await transporter.sendMail({
        from:    `"${fromName}" <${process.env.SMTP_USER}>`,
        to:      to_email,
        subject: subject,
        html:    body.replace(/\n/g, '<br>'),
      });

      // نحدث الحالة إلى مُرسَل
      await pool.query(
        "UPDATE messages SET status='مُرسَل', sent_at=NOW() WHERE id=?",
        [result.insertId]
      );

      res.json({ message: 'تم إرسال البريد بنجاح', id: result.insertId });
    } catch (mailErr) {
      await pool.query("UPDATE messages SET status='فشل' WHERE id=?", [result.insertId]);
      throw mailErr;
    }
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, u.display_name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { send, getAll };
