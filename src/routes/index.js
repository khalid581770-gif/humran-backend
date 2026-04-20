const express = require('express');
const router  = express.Router();

router.use('/auth',       require('./auth'));
router.use('/courses',    require('./courses'));
router.use('/payments',   require('./payments'));
router.use('/excel',      require('./excel'));
router.use('/messages',   require('./messages'));
router.use('/settings',   require('./settings'));
router.use('/calendar',   require('./calendar'));
router.use('/institutes', require('./institutes'));
router.use('/stats',      require('./stats'));

module.exports = router;
