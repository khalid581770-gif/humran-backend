// ============================================================
// معالج الأخطاء العام
// يلتقط أي خطأ غير معالج ويُرجع رسالة واضحة
// ============================================================
function errorHandler(err, req, res, next) {
  console.error('🔴 خطأ في السيرفر:', err.message);

  // خطأ في قاعدة البيانات
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'البيانات موجودة مسبقاً' });
  }

  // خطأ عام
  res.status(err.status || 500).json({
    message: err.message || 'خطأ داخلي في السيرفر',
  });
}

module.exports = errorHandler;
