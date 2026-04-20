# منصة م. عايض آل حمران — Backend API

## 🗂️ هيكل المشروع
```
humran-backend/
├── src/
│   ├── index.js                  ← نقطة البداية الرئيسية
│   ├── config/
│   │   └── database.js           ← اتصال MySQL (Connection Pool)
│   ├── middleware/
│   │   ├── auth.js               ← JWT + صلاحيات
│   │   ├── security.js           ← Rate Limiting + Headers
│   │   └── errorHandler.js       ← معالج الأخطاء العام
│   ├── controllers/              ← منطق كل قسم
│   ├── routes/                   ← API endpoints
│   └── utils/
│       ├── notifications.js      ← تنبيهات تلقائية يومية
│       └── logger.js             ← تسجيل السجلات
├── uploads/                      ← الملفات المرفوعة
├── logs/                         ← سجلات النظام
├── setup.js                      ← إنشاء المستخدم الافتراضي
└── .env.example
```

## 🚀 خطوات التشغيل
```bash
# 1. تثبيت المكتبات
npm install

# 2. إعداد المتغيرات البيئية
cp .env.example .env
# افتح ملف .env وعدّل بيانات MySQL

# 3. تشغيل ملف SQL في قاعدة البيانات
# mysql -u root -p < database_schema.sql

# 4. إنشاء المستخدم الافتراضي (عمي خالد / 1100)
node setup.js

# 5. تشغيل السيرفر
npm run dev
```

## 📡 API Endpoints الرئيسية
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | /api/auth/login | تسجيل الدخول |
| GET  | /api/courses | جلب الدورات |
| POST | /api/courses | إضافة دورة |
| GET  | /api/courses/stats/dashboard | إحصائيات لوحة التحكم |
| GET  | /api/payments/report | التقرير المالي |
| POST | /api/payments | تسجيل دفعة |
| GET  | /api/calendar | أحداث التقويم |
| PUT  | /api/calendar/:id | تحديث موعد (السحب والإفلات) |
| POST | /api/excel/import | استيراد Excel |
| GET  | /api/excel/export | تصدير Excel |
| POST | /api/messages/send | إرسال بريد |
| GET  | /api/stats/annual | التقرير السنوي |
| GET  | /api/stats/comparison | مقارنة سنوية |
| GET  | /health | التحقق من حالة السيرفر |

## 🔐 الأمان
- JWT Token (صالح 7 أيام)
- bcrypt لتشفير كلمات المرور (cost: 12)
- Rate Limiting: 200 طلب / 15 دقيقة
- Rate Limiting لتسجيل الدخول: 5 محاولات / 10 دقائق
- Security Headers (X-Frame-Options, XSS-Protection...)

## 🔔 التنبيهات التلقائية
يعمل النظام يومياً الساعة 8 صباحاً ويُرسل
تنبيهاً بالبريد الإلكتروني لكل دورة ستبدأ بعد 3 أيام.
