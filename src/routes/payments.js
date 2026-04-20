const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/report',          ctrl.getFinancialReport);
router.get('/:courseId',       ctrl.getByCourse);
router.post('/',               ctrl.create);
router.delete('/:id',          ctrl.remove);

module.exports = router;
