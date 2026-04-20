// ============================================================
// Controller: إدارة الدورات التدريبية
// ============================================================
const { pool } = require('../config/database');

// ─────────────────────────────────────────
// GET /api/courses — جلب جميع الدورات
// ─────────────────────────────────────────
async function getAll(req, res, next) {
  try {
    const { status, month, year, search } = req.query;
    let sql = `
      SELECT c.*, i.name AS institute_name, i.contact_person,
             COALESCE(SUM(p.amount_paid), 0) AS paid_amount,
             c.total_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_amount
      FROM courses c
      LEFT JOIN institutes i ON c.institute_id = i.id
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status)  { sql += ' AND c.status = ?';                           params.push(status); }
    if (month)   { sql += ' AND MONTH(c.start_date) = ?';                params.push(month);  }
    if (year)    { sql += ' AND YEAR(c.start_date) = ?';                 params.push(year);   }
    if (search)  { sql += ' AND c.name LIKE ?';                          params.push(`%${search}%`); }

    sql += ' GROUP BY c.id ORDER BY c.start_date ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// GET /api/courses/:id — دورة واحدة
// ─────────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, i.name AS institute_name, i.contact_person,
             COALESCE(SUM(p.amount_paid), 0) AS paid_amount,
             c.total_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_amount
      FROM courses c
      LEFT JOIN institutes i ON c.institute_id = i.id
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'الدورة غير موجودة' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// POST /api/courses — إضافة دورة
// ─────────────────────────────────────────
async function create(req, res, next) {
  try {
    const {
      name, start_date, end_date, start_time,
      location, mode, daily_rate, total_days,
      status, institute_id, notes
    } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ message: 'اسم الدورة والتاريخ مطلوبان' });
    }

    const [result] = await pool.query(`
      INSERT INTO courses
        (name, start_date, end_date, start_time, location, mode,
         daily_rate, total_days, status, institute_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, start_date, end_date, start_time || null,
      location, mode || 'أونلاين', daily_rate || 0,
      total_days || 1, status || 'مجدولة',
      institute_id || null, notes || null, req.user.id
    ]);

    // نضيف حدث في التقويم تلقائياً
    await pool.query(`
      INSERT INTO calendar_events (course_id, title, event_date, end_date, color)
      VALUES (?, ?, ?, ?, '#1D9E75')
    `, [result.insertId, name, start_date, end_date]);

    res.status(201).json({ message: 'تمت إضافة الدورة بنجاح', id: result.insertId });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// PUT /api/courses/:id — تعديل دورة
// ─────────────────────────────────────────
async function update(req, res, next) {
  try {
    const {
      name, start_date, end_date, start_time,
      location, mode, daily_rate, total_days,
      status, institute_id, notes
    } = req.body;

    await pool.query(`
      UPDATE courses SET
        name=?, start_date=?, end_date=?, start_time=?,
        location=?, mode=?, daily_rate=?, total_days=?,
        status=?, institute_id=?, notes=?
      WHERE id=?
    `, [
      name, start_date, end_date, start_time || null,
      location, mode, daily_rate, total_days,
      status, institute_id || null, notes || null,
      req.params.id
    ]);

    // نحدث حدث التقويم المرتبط
    await pool.query(`
      UPDATE calendar_events
      SET title=?, event_date=?, end_date=?
      WHERE course_id=?
    `, [name, start_date, end_date, req.params.id]);

    res.json({ message: 'تم تحديث الدورة بنجاح' });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// DELETE /api/courses/:id — حذف دورة
// ─────────────────────────────────────────
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM courses WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف الدورة' });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// GET /api/courses/stats/dashboard — إحصائيات لوحة التحكم
// ─────────────────────────────────────────
async function getDashboardStats(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();

    // إجمالي الدورات حسب الحالة
    const [statusCounts] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM courses
      WHERE YEAR(start_date) = ?
      GROUP BY status
    `, [year]);

    // إجمالي الأرباح
    const [revenue] = await pool.query(`
      SELECT COALESCE(SUM(p.amount_paid), 0) AS total_revenue
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE YEAR(c.start_date) = ?
    `, [year]);

    // أقرب دورة قادمة
    const [upcoming] = await pool.query(`
      SELECT id, name, start_date, location, mode
      FROM courses
      WHERE start_date >= CURDATE() AND status NOT IN ('ملغية','مكتملة')
      ORDER BY start_date ASC
      LIMIT 1
    `);

    // إحصائيات شهرية (عدد الدورات + الإيرادات)
    const [monthly] = await pool.query(`
      SELECT
        MONTH(c.start_date)                    AS month,
        COUNT(DISTINCT c.id)                   AS courses_count,
        COALESCE(SUM(p.amount_paid), 0)        AS revenue
      FROM courses c
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE YEAR(c.start_date) = ?
      GROUP BY MONTH(c.start_date)
      ORDER BY month ASC
    `, [year]);

    res.json({
      status_counts:   statusCounts,
      total_revenue:   revenue[0]?.total_revenue || 0,
      upcoming_course: upcoming[0] || null,
      monthly_stats:   monthly,
    });
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, remove, getDashboardStats };
