// ============================================================
// Middleware للتحقق من صحة JWT Token
// يُستخدم لحماية جميع الـ Routes التي تحتاج تسجيل دخول
// ============================================================
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // نستخرج التوكن من الـ Header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // نحفظ بيانات المستخدم في الـ Request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'انتهت صلاحية الجلسة — سجّل دخولك مجدداً' });
  }
}

// Middleware للتحقق من صلاحية Admin فقط
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'هذه العملية تحتاج صلاحيات مشرف' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
