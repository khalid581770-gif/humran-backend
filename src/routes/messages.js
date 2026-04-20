const express = require('express');
const router  = express.Router();
const { send, getAll } = require('../controllers/messagesController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/',    getAll);
router.post('/send', send);

module.exports = router;
