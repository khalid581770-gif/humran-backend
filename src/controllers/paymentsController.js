// ============================================================
// Controller: إدارة المدفوعات
// ============================================================
const { pool } = require('../config/database');

async function getByCourse(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM payments WHERE course_id = ? ORDER BY payment_date DESC
    `, [req.params.courseId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { course_id, amount_paid, payment_date, payment_method, reference_no, notes } = req.body;

    if (!course_id || !amount_paid || !payment_date) {
      return res.status(400).json({ message: 'بيانات الدفعة غير مكتملة' });
    }

    // نتحقق أن المبلغ لا يتجاوز المتبقي
    const [course] = await pool.query(`
      SELECT c.total_amount, COALESCE(SUM(p.amount_paid), 0) AS paid
      FROM courses c
      LEFT JOIN payments p ON p.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [course_id]);

    if (course.length === 0) return res.status(404).json({ message: 'الدورة غير موجودة' });

    const remaining = course[0].total_amount - course[0].paid;
    if (parseFloat(amount_paid) > remaining) {
      return res.status(400).json({
        message: `المبلغ يتجاوز المتبقي (${remaining.toFixed(2)} ريال)`
      });
    }

    const [result] = await pool.query(`
      INSERT INTO payments (course_id, amount_paid, payment_date, payment_method, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [course_id, amount_paid, payment_date, payment_method || 'تحويل', reference_no || null, notes || null]);

    // إذا اكتمل السداد، نحدث حالة الدورة
    const newPaid = course[0].paid + parseFloat(amount_paid);
    if (newPaid >= course[0].total_amount) {
      await pool.query("UPDATE courses SET status='مكتملة' WHERE id=? AND status='مؤكدة'", [course_id]);
    }

    res.status(201).json({ message: 'تم تسجيل الدفعة بنجاح', id: result.insertId });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM payments WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف الدفعة' });
  } catch (err) { next(err); }
}

// تقرير مالي شامل
async function getFinancialReport(req, res, next) {
  try {
    const { year } = req.query;
    const [rows] = await pool.query(`
      SELECT
        c.id, c.name, c.start_date, c.total_amount,
        COALESCE(SUM(p.amount_paid), 0) AS paid_amount,
        c.total_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining,
        i.name AS institute_name
      FROM courses c
      LEFT JOIN payments p ON p.course_id = c.id
      LEFT JOIN institutes i ON c.institute_id = i.id
      WHERE (? IS NULL OR YEAR(c.start_date) = ?)
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `, [year || null, year || null]);
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { getByCourse, create, remove, getFinancialReport };
