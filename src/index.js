// ============================================================
// نقطة البداية الرئيسية — النسخة النهائية المحسّنة
// منصة م. عايض آل حمران للدورات التدريبية
// ============================================================
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const path         = require('path');

const { testConnection }             = require('./config/database');
const routes                         = require('./routes/index');
const errorHandler                   = require('./middleware/errorHandler');
const { rateLimiter, securityHeaders } = require('./middleware/security');
const { requestLogger, logger }      = require('./utils/logger');
const { startNotificationScheduler } = require('./utils/notifications');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ─────────────────────────────
app.use(securityHeaders);
app.use(rateLimiter(200, 15 * 60 * 1000)); // 200 طلب / 15 دقيقة

// ── General Middlewares ───────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── Static Files ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────
app.use('/api', routes);

// ── Health Check ──────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    message:   '✅ السيرفر يعمل بشكل طبيعي',
  });
});

// ── 404 Handler ───────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `المسار ${req.path} غير موجود` });
});

// ── Error Handler (يجب أن يكون آخر middleware) ──
app.use(errorHandler);

// ── Start ─────────────────────────────────
async function start() {
  await testConnection();

  app.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV });
    console.log(`🚀 السيرفر يعمل على:  http://localhost:${PORT}`);
    console.log(`📡 API متاحة على:     http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check:      http://localhost:${PORT}/health`);
  });

  // تشغيل جدولة التنبيهات التلقائية
  if (process.env.NODE_ENV !== 'test') {
    startNotificationScheduler();
  }
}

start();
