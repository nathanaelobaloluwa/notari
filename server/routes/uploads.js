const express = require('express');
const mongoose = require('mongoose');
const Upload = require('../models/Upload');

const router = express.Router();

// GET /api/uploads/:category/:id - Stream uploaded image from MongoDB
router.get('/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;

    if (!['flyer', 'identification'].includes(category)) {
      return res.status(400).json({ error: 'Invalid upload category.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Upload not found.' });
    }

    const upload = await Upload.findById(id).lean();
    if (!upload || upload.category !== category) {
      return res.status(404).json({ error: 'Upload not found.' });
    }

    res.set('Content-Type', upload.mimeType || 'application/octet-stream');
    res.set('Content-Length', String(upload.size || upload.data.length || 0));
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(upload.data);
  } catch (err) {
    console.error('[Upload Route Error]', err);
    return res.status(500).json({ error: 'Unable to retrieve uploaded file.' });
  }
});

module.exports = router;
