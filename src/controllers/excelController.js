// ============================================================
// Controller: استيراد وتصدير Excel
// ============================================================
const XLSX   = require('xlsx');
const { pool } = require('../config/database');

// ─────────────────────────────────────────
// POST /api/excel/import — رفع واستيراد ملف Excel
// ─────────────────────────────────────────
async function importExcel(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'لم يتم رفع أي ملف' });

    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // نتوقع أعمدة مشابهة لملف Excel الأصلي
    // اليوم | التاريخ | الشهر | اسم البرنامج | مؤكد/غير مؤكد | اسم المعهد | المسؤول | حضوري/أونلاين | الموقع | المبلغ اليومية
    const COLUMN_MAP = {
      course:    ['اسم البرنامج', 'name', 'البرنامج'],
      date:      ['التاريخ', 'start_date', 'date'],
      status:    ['مؤكد/غير مؤكد', 'status'],
      institute: ['اسم المعهد', 'institute'],
      contact:   ['المسؤول', 'contact_person'],
      mode:      ['حضوري/أونلاين', 'mode'],
      location:  ['الموقع', 'location'],
      amount:    ['المبلغ  اليومية', 'المبلغ اليومية', 'daily_rate', 'amount'],
    };

    // دالة مساعدة لإيجاد القيمة من أعمدة بديلة
    function getVal(row, keys) {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
      }
      return null;
    }

    // نجمع الدورات الفريدة (قد يتكرر اسم الدورة لعدة أيام)
    const courseMap = new Map();
    for (const row of rows) {
      const name   = getVal(row, COLUMN_MAP.course);
      const date   = getVal(row, COLUMN_MAP.date);
      const amount = getVal(row, COLUMN_MAP.amount);

      if (!name || name === '×' || name === '—' || name.trim() === '') continue;

      const key = name.trim();
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name:         key,
          start_date:   date,
          end_date:     date,
          status:       getVal(row, COLUMN_MAP.status) || 'مجدولة',
          institute:    getVal(row, COLUMN_MAP.institute),
          contact:      getVal(row, COLUMN_MAP.contact),
          mode:         getVal(row, COLUMN_MAP.mode) || 'أونلاين',
          location:     getVal(row, COLUMN_MAP.location),
          daily_rate:   parseFloat(amount) || 0,
          days:         1,
        });
      } else {
        // نمدد تاريخ النهاية ونزيد عدد الأيام
        const c = courseMap.get(key);
        c.end_date = date || c.end_date;
        c.days++;
      }
    }

    let imported = 0;
    const errors = [];

    for (const [, c] of courseMap) {
      try {
        // نبحث أو ننشئ المعهد
        let instituteId = null;
        if (c.institute) {
          const [existing] = await pool.query(
            'SELECT id FROM institutes WHERE name = ?', [c.institute.trim()]
          );
          if (existing.length > 0) {
            instituteId = existing[0].id;
          } else {
            const [ins] = await pool.query(
              'INSERT INTO institutes (name, contact_person) VALUES (?, ?)',
              [c.institute.trim(), c.contact || null]
            );
            instituteId = ins.insertId;
          }
        }

        // نتحقق من عدم تكرار الدورة بنفس الاسم والتاريخ
        const [dup] = await pool.query(
          'SELECT id FROM courses WHERE name = ? AND start_date = ?',
          [c.name, c.start_date]
        );
        if (dup.length > 0) { errors.push(`تكرار: ${c.name}`); continue; }

        // نضيف الدورة
        const statusMap = { 'مؤكد': 'مؤكدة', 'غير مؤكد': 'غير مؤكدة' };
        const [result] = await pool.query(`
          INSERT INTO courses
            (name, start_date, end_date, mode, location, daily_rate, total_days,
             status, institute_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          c.name, c.start_date, c.end_date,
          c.mode, c.location, c.daily_rate, c.days,
          statusMap[c.status] || 'مجدولة',
          instituteId, req.user.id
        ]);

        // إضافة حدث تقويم
        await pool.query(
          'INSERT INTO calendar_events (course_id, title, event_date, end_date) VALUES (?,?,?,?)',
          [result.insertId, c.name, c.start_date, c.end_date]
        );

        imported++;
      } catch (e) {
        errors.push(`خطأ في: ${c.name} — ${e.message}`);
      }
    }

    // نسجل عملية الاستيراد
    await pool.query(`
      INSERT INTO excel_imports (filename, imported_by, records_count, status, error_log)
      VALUES (?, ?, ?, ?, ?)
    `, [
      req.file.originalname, req.user.id, imported,
      errors.length > 0 ? 'فشل جزئي' : 'ناجح',
      errors.length > 0 ? errors.join('\n') : null
    ]);

    res.json({
      message:  `تم استيراد ${imported} دورة بنجاح`,
      imported,
      errors,
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────
// GET /api/excel/export — تصدير الدورات كـ Excel
// ─────────────────────────────────────────
async function exportExcel(req, res, next) {
  try {
    const [courses] = await pool.query(`
      SELECT
        c.name AS 'اسم الدورة',
        c.start_date AS 'تاريخ البدء',
        c.end_date AS 'تاريخ الانتهاء',
        c.mode AS 'النوع',
        c.location AS 'الموقع',
        c.daily_rate AS 'المبلغ اليومي',
        c.total_days AS 'عدد الأيام',
        c.total_amount AS 'إجمالي المبلغ',
        c.status AS 'الحالة',
        i.name AS 'المعهد',
        COALESCE(SUM(p.amount_paid), 0) AS 'المبلغ المدفوع',
        c.total_amount - COALESCE(SUM(p.amount_paid), 0) AS 'المبلغ المتبقي'
      FROM courses c
      LEFT JOIN institutes i ON c.institute_id = i.id
      LEFT JOIN payments p ON p.course_id = c.id
      GROUP BY c.id
      ORDER BY c.start_date ASC
    `);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(courses);

    // تعديل عرض الأعمدة
    ws['!cols'] = Array(12).fill({ wch: 20 });

    XLSX.utils.book_append_sheet(wb, ws, 'الدورات');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=courses_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) { next(err); }
}

module.exports = { importExcel, exportExcel };
