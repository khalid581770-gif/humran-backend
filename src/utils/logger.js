// ============================================================
// Logger بسيط يكتب السجلات في ملف + الكونسول
// ============================================================
const fs   = require('fs');
const path = require('path');

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().slice(0,10)}.log`);

// نضمن وجود مجلد السجلات
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(level, message, meta = {}) {
  const entry = {
    time:    new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const logger = {
  info:  (msg, meta) => log('INFO',  msg, meta),
  warn:  (msg, meta) => log('WARN',  msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
};

// Middleware لتسجيل كل طلب
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method:   req.method,
      path:     req.path,
      status:   res.statusCode,
      ms:       Date.now() - start,
      ip:       req.ip,
    });
  });
  next();
}

module.exports = { logger, requestLogger };
