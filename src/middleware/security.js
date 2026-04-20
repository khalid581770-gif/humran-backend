// ============================================================
// أمان إضافي: Rate Limiting + Security Headers
// ============================================================

// عداد بسيط في الذاكرة (يمكن استبداله بـ Redis لاحقاً)
const requestCounts = new Map();

function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key  = req.ip;
    const now  = Date.now();
    const data = requestCounts.get(key) || { count: 0, start: now };

    // إعادة الضبط إذا انتهت النافذة الزمنية
    if (now - data.start > windowMs) {
      data.count = 0;
      data.start = now;
    }

    data.count++;
    requestCounts.set(key, data);

    if (data.count > maxRequests) {
      return res.status(429).json({
        message: 'طلبات كثيرة جداً — حاول بعد قليل',
      });
    }

    next();
  };
}

// Rate limiter صارم لمسار تسجيل الدخول (5 محاولات فقط)
function loginRateLimiter() {
  return rateLimiter(5, 10 * 60 * 1000); // 5 محاولات كل 10 دقائق
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

module.exports = { rateLimiter, loginRateLimiter, securityHeaders };
