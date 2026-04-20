const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, COUNT(c.id) AS courses_count
      FROM institutes i
      LEFT JOIN courses c ON c.institute_id = i.id
      GROUP BY i.id ORDER BY i.name ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, contact_person, phone, email, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'اسم الجهة مطلوب' });
    const [r] = await pool.query(
      'INSERT INTO institutes (name, contact_person, phone, email, notes) VALUES (?,?,?,?,?)',
      [name, contact_person||null, phone||null, email||null, notes||null]
    );
    res.status(201).json({ id: r.insertId, message: 'تم إضافة الجهة' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, contact_person, phone, email, notes } = req.body;
    await pool.query(
      'UPDATE institutes SET name=?, contact_person=?, phone=?, email=?, notes=? WHERE id=?',
      [name, contact_person||null, phone||null, email||null, notes||null, req.params.id]
    );
    res.json({ message: 'تم التحديث' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM institutes WHERE id=?', [req.params.id]);
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
});

module.exports = router;
