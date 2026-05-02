// ============================================================
// Controller: إدارة الدورات التدريبية - PostgreSQL
// ============================================================
const { pool } = require('../config/database');

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
    let n = 1;

    if (status) { sql += ` AND c.status = $${n++}`; params.push(status); }
    if (month) { sql += ` AND EXTRACT(MONTH FROM c.start_date) = $${n++}`; params.push(month); }
    if (year) { sql += ` AND EXTRACT(YEAR FROM c.start_date) = $${n++}`; params.push(year); }
    if (search) { sql += ` AND c.name ILIKE $${n++}`; params.push(`%${search}%`); }

    sql += `
      GROUP BY c.id, i.name, i.contact_person
      ORDER BY c.start_date ASC
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT c.*, i.name AS institute_name, i.contact_person,
             COALESCE(SUM(p.amount_paid), 0) AS paid_amount,
             c.total_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_amount
      FROM courses c
      LEFT JOIN institutes i ON c.institute_id = i.id
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, i.name, i.contact_person
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الدورة غير موجودة' });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

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

    const result = await pool.query(`
      INSERT INTO courses
        (name, start_date, end_date, start_time, location, mode,
         daily_rate, total_days, status, institute_id, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      name, start_date, end_date, start_time || null,
      location || null, mode || 'أونلاين', daily_rate || 0,
      total_days || 1, status || 'مجدولة',
      institute_id || null, notes || null, req.user?.id || null
    ]);

    const courseId = result.rows[0].id;

    await pool.query(`
      INSERT INTO calendar_events (course_id, title, event_date, end_date, color)
      VALUES ($1, $2, $3, $4, $5)
    `, [courseId, name, start_date, end_date, '#1D9E75']);

    res.status(201).json({ message: 'تمت إضافة الدورة بنجاح', id: courseId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const {
      name, start_date, end_date, start_time,
      location, mode, daily_rate, total_days,
      status, institute_id, notes
    } = req.body;

    await pool.query(`
      UPDATE courses SET
        name = $1,
        start_date = $2,
        end_date = $3,
        start_time = $4,
        location = $5,
        mode = $6,
        daily_rate = $7,
        total_days = $8,
        status = $9,
        institute_id = $10,
        notes = $11
      WHERE id = $12
    `, [
      name, start_date, end_date, start_time || null,
      location || null, mode, daily_rate, total_days,
      status, institute_id || null, notes || null,
      req.params.id
    ]);

    await pool.query(`
      UPDATE calendar_events
      SET title = $1, event_date = $2, end_date = $3
      WHERE course_id = $4
    `, [name, start_date, end_date, req.params.id]);

    res.json({ message: 'تم تحديث الدورة بنجاح' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الدورة' });
  } catch (err) { next(err); }
}

async function getDashboardStats(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();

    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM courses
      WHERE EXTRACT(YEAR FROM start_date) = $1
      GROUP BY status
    `, [year]);

    const revenue = await pool.query(`
      SELECT COALESCE(SUM(p.amount_paid), 0) AS total_revenue
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE EXTRACT(YEAR FROM c.start_date) = $1
    `, [year]);

    const upcoming = await pool.query(`
      SELECT id, name, start_date, location, mode
      FROM courses
      WHERE start_date >= CURRENT_DATE
        AND status NOT IN ('ملغية','مكتملة')
      ORDER BY start_date ASC
      LIMIT 1
    `);

    const monthly = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM c.start_date) AS month,
        COUNT(DISTINCT c.id) AS courses_count,
        COALESCE(SUM(p.amount_paid), 0) AS revenue
      FROM courses c
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE EXTRACT(YEAR FROM c.start_date) = $1
      GROUP BY EXTRACT(MONTH FROM c.start_date)
      ORDER BY month ASC
    `, [year]);

    res.json({
      status_counts: statusCounts.rows,
      total_revenue: revenue.rows[0]?.total_revenue || 0,
      upcoming_course: upcoming.rows[0] || null,
      monthly_stats: monthly.rows,
    });
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, remove, getDashboardStats };
