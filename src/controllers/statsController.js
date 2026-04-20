// ============================================================
// Controller: إحصائيات متقدمة وتقارير
// ============================================================
const { pool } = require('../config/database');

// تقرير سنوي شامل
async function getAnnualReport(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();

    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*)                                           AS total_courses,
        COUNT(CASE WHEN status='مكتملة'    THEN 1 END)    AS completed,
        COUNT(CASE WHEN status='ملغية'     THEN 1 END)    AS cancelled,
        COUNT(CASE WHEN status='مؤكدة'     THEN 1 END)    AS confirmed,
        COUNT(CASE WHEN status='مجدولة'    THEN 1 END)    AS scheduled,
        SUM(total_amount)                                  AS total_billed,
        SUM(total_days)                                    AS total_days
      FROM courses WHERE YEAR(start_date) = ?
    `, [year]);

    const [[payments]] = await pool.query(`
      SELECT
        COALESCE(SUM(p.amount_paid), 0)  AS total_collected,
        COUNT(DISTINCT p.id)             AS payment_count
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE YEAR(c.start_date) = ?
    `, [year]);

    // أعلى الجهات إيراداً
    const [topInstitutes] = await pool.query(`
      SELECT i.name, COUNT(c.id) AS courses_count,
             COALESCE(SUM(p.amount_paid), 0) AS revenue
      FROM institutes i
      JOIN courses c ON c.institute_id = i.id
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE YEAR(c.start_date) = ?
      GROUP BY i.id ORDER BY revenue DESC LIMIT 5
    `, [year]);

    // أكثر الدورات تكراراً
    const [topCourses] = await pool.query(`
      SELECT name, COUNT(*) AS count, SUM(total_amount) AS total
      FROM courses
      WHERE YEAR(start_date) = ? AND status != 'ملغية'
      GROUP BY name ORDER BY count DESC LIMIT 5
    `, [year]);

    res.json({
      year,
      summary: { ...totals, ...payments },
      topInstitutes,
      topCourses,
    });
  } catch (err) { next(err); }
}

// مقارنة سنوية (السنة الحالية vs السابقة)
async function getYearComparison(req, res, next) {
  try {
    const thisYear = new Date().getFullYear();
    const lastYear = thisYear - 1;

    const getData = async (y) => {
      const [[r]] = await pool.query(`
        SELECT COUNT(*) AS courses, SUM(total_amount) AS billed
        FROM courses WHERE YEAR(start_date) = ?
      `, [y]);
      const [[p]] = await pool.query(`
        SELECT COALESCE(SUM(pa.amount_paid),0) AS collected
        FROM payments pa JOIN courses c ON pa.course_id=c.id WHERE YEAR(c.start_date)=?
      `, [y]);
      return { year: y, ...r, ...p };
    };

    const [current, previous] = await Promise.all([getData(thisYear), getData(lastYear)]);
    res.json({ current, previous });
  } catch (err) { next(err); }
}

module.exports = { getAnnualReport, getYearComparison };
