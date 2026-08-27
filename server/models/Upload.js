const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  data: { type: Buffer, required: true },
  mimeType: { type: String, required: true, trim: true },
  originalName: { type: String, default: '', trim: true },
  size: { type: Number, default: 0, min: 0 },
  category: { type: String, enum: ['flyer', 'identification'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Upload', uploadSchema);
