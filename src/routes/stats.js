const express = require('express');
const router  = express.Router();
const { getAnnualReport, getYearComparison } = require('../controllers/statsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/annual',     getAnnualReport);
router.get('/comparison', getYearComparison);
module.exports = router;
