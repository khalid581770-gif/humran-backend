const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/coursesController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stats/dashboard', ctrl.getDashboardStats);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',   ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
