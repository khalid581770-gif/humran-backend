const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/calendar?start=2025-01-01&end=2025-12-31
router.get('/', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const [rows] = await pool.query(`
      SELECT ce.*, c.status AS course_status
      FROM calendar_events ce
      LEFT JOIN courses c ON ce.course_id = c.id
      WHERE (? IS NULL OR ce.event_date >= ?)
        AND (? IS NULL OR ce.end_date <= ? OR ce.event_date <= ?)
      ORDER BY ce.event_date ASC
    `, [start||null, start||null, end||null, end||null, end||null]);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/calendar/:id — تعديل التاريخ عبر السحب والإفلات
router.put('/:id', async (req, res, next) => {
  try {
    const { event_date, end_date } = req.body;
    await pool.query(
      'UPDATE calendar_events SET event_date=?, end_date=? WHERE id=?',
      [event_date, end_date || event_date, req.params.id]
    );
    // نحدث الدورة المرتبطة إذا وجدت
    await pool.query(
      'UPDATE courses SET start_date=?, end_date=? WHERE id=(SELECT course_id FROM calendar_events WHERE id=? LIMIT 1)',
      [event_date, end_date || event_date, req.params.id]
    );
    res.json({ message: 'تم تحديث الموعد' });
  } catch (err) { next(err); }
});

module.exports = router;
