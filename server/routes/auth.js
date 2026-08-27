const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const identificationUploadDir = path.join(__dirname, '..', 'uploads', 'identification');
if (!fs.existsSync(identificationUploadDir)) {
  fs.mkdirSync(identificationUploadDir, { recursive: true });
}

const identificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, identificationUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const uploadIdentification = multer({
  storage: identificationStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for identification.'));
    }
  }
});

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup — create a pending admin access request
router.post('/signup', uploadIdentification.single('identification'), authController.signup);

// GET /api/auth/me (verify current token)
router.get('/me', requireAdmin, authController.getMe);

module.exports = router;
