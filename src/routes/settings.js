const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/settingsController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.use(authMiddleware);
router.get('/',                        ctrl.getAll);
router.put('/',     adminOnly,         ctrl.update);
router.post('/logo', adminOnly, upload.single('logo'), ctrl.uploadLogo);
router.get('/users', adminOnly,        ctrl.getUsers);
router.post('/users', adminOnly,       ctrl.createUser);

module.exports = router;
