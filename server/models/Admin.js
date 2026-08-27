const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username:     { type: String, required: [true, 'Username is required'], unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: [true, 'Password hash is required'] },
  clubName:     { type: String, trim: true, default: '' },
  email:        { type: String, trim: true, lowercase: true, default: '' },
  referenceLink:{ type: String, trim: true, default: '' },
  identificationUrl: { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  role:         { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
