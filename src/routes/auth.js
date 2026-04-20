const express = require('express');
const router  = express.Router();
const { login, me, changePassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login',           login);
router.get('/me',               authMiddleware, me);
router.put('/change-password',  authMiddleware, changePassword);

module.exports = router;
