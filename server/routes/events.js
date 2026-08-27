const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const requireAdmin = require('../middleware/requireAdmin');
const multer = require('multer');
const path = require('path');

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for flyers.'));
    }
  }
});

// Admin-only routes
router.get('/mine', requireAdmin, noStore, eventController.getMyEvents);

// Public routes
router.get('/', noStore, eventController.getEvents);
router.get('/:id', noStore, eventController.getEventById);
router.post('/:id/register', eventController.registerForEvent);

// Admin-only routes
router.post('/', requireAdmin, upload.single('flyer'), eventController.createEvent);
router.put('/:id', requireAdmin, eventController.updateEvent);
router.delete('/:id', requireAdmin, eventController.deleteEvent);
router.get('/:id/attendees', requireAdmin, noStore, eventController.getAttendees);

module.exports = router;
