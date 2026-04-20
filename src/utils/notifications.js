// ============================================================
// التنبيهات التلقائية — تُشغَّل كـ Cron Job يومياً
// تُرسل إشعارات قبل 3 أيام من كل دورة
// ============================================================
const { pool }     = require('../config/database');
const nodemailer   = require('nodemailer');

async function getTransporter() {
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'smtp%'"
  );
  const cfg = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
  if (!cfg.smtp_host || !cfg.smtp_user) return null;

  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || 587),
    secure: false,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
}

async function sendUpcomingCourseNotifications() {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    // الدورات خلال 3 أيام القادمة
    const [courses] = await pool.query(`
      SELECT c.*, i.name AS institute_name, i.contact_person, i.email AS institute_email
      FROM courses c
      LEFT JOIN institutes i ON c.institute_id = i.id
      WHERE c.start_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND c.status IN ('مؤكدة', 'مجدولة')
    `);

    const [settings] = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'smtp_from_name'"
    );
    const fromName = settings[0]?.setting_value || 'م. عايض آل حمران';
    const fromEmail = (await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'smtp_user'"
    ))[0][0]?.setting_value;

    for (const course of courses) {
      if (!course.institute_email) continue;

      const body = `
        <div dir="rtl" style="font-family: Tajawal, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F2744; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0;">تذكير بدورة تدريبية قادمة</h2>
          </div>
          <div style="background: #fff; padding: 28px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
            <p>السلام عليكم،</p>
            <p>نودّ تذكيركم بأن الدورة التدريبية التالية ستبدأ خلال <strong>3 أيام</strong>:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #F8F9FC;">
                <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #e0e0e0;">اسم الدورة</td>
                <td style="padding: 10px 14px; border: 1px solid #e0e0e0;">${course.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #e0e0e0;">تاريخ البدء</td>
                <td style="padding: 10px 14px; border: 1px solid #e0e0e0;">${course.start_date?.toISOString?.()?.slice(0,10) || course.start_date}</td>
              </tr>
              <tr style="background: #F8F9FC;">
                <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #e0e0e0;">الموقع</td>
                <td style="padding: 10px 14px; border: 1px solid #e0e0e0;">${course.location || 'سيُحدَّد لاحقاً'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #e0e0e0;">النوع</td>
                <td style="padding: 10px 14px; border: 1px solid #e0e0e0;">${course.mode}</td>
              </tr>
            </table>
            <p style="color: #888; font-size: 13px;">مع تحيات فريق م. عايض آل حمران</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from:    `"${fromName}" <${fromEmail}>`,
        to:      course.institute_email,
        subject: `تذكير: دورة "${course.name}" تبدأ بعد 3 أيام`,
        html:    body,
      });

      // نسجّل الرسالة في قاعدة البيانات
      await pool.query(`
        INSERT INTO messages (sender_id, to_email, subject, body, status, sent_at)
        VALUES (1, ?, ?, 'تنبيه تلقائي', 'مُرسَل', NOW())
      `, [course.institute_email, `تذكير: ${course.name}`]);
    }

    console.log(`✅ تم إرسال ${courses.length} تنبيه`);
  } catch (err) {
    console.error('❌ خطأ في إرسال التنبيهات:', err.message);
  }
}

// دالة جدولة بسيطة — تعمل كل يوم الساعة 8 صباحاً
function startNotificationScheduler() {
  const now    = new Date();
  const next8am = new Date(now);
  next8am.setHours(8, 0, 0, 0);
  if (now >= next8am) next8am.setDate(next8am.getDate() + 1);

  const msUntil8am = next8am - now;

  setTimeout(() => {
    sendUpcomingCourseNotifications();
    // بعد أول تشغيل، نكرر كل 24 ساعة
    setInterval(sendUpcomingCourseNotifications, 24 * 60 * 60 * 1000);
  }, msUntil8am);

  console.log(`🔔 جدولة التنبيهات: التشغيل القادم في ${next8am.toLocaleTimeString('ar-SA')}`);
}

module.exports = { startNotificationScheduler, sendUpcomingCourseNotifications };
