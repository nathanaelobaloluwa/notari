const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, trim: true, lowercase: true },
  ticketCode: {
    type: String,
    default: () => 'NTR-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  bookedAt:   { type: Date, default: Date.now }
});

const waitlistSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, trim: true, lowercase: true },
  joinedAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  eventName:   { type: String, required: [true, 'Event name is required'], trim: true },
  organizer:   { type: String, required: [true, 'Organizer is required'], trim: true },
  faculty:     { type: String, trim: true, default: 'General' },
  date:        { type: Date,   required: [true, 'Event date and time are required'] },
  venue:       { type: String, required: [true, 'Venue is required'], trim: true },
  description: { type: String, trim: true, default: '' },
  contact:     { type: String, trim: true, default: '' },
  capacity:    { type: Number, default: 0, min: 0 },
  flyerUrl:    { type: String, required: [true, 'Flyer image is required'] },
  flyerUploadId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  attendees:   [attendeeSchema],
  waitlist:    [waitlistSchema],
  createdAt:   { type: Date, default: Date.now }
});

// Virtual: remaining seats (null when unlimited)
eventSchema.virtual('seatsLeft').get(function () {
  if (this.capacity === 0) return null;
  return Math.max(0, this.capacity - (this.attendees ? this.attendees.length : 0));
});

// Virtual: whether the event is fully booked
eventSchema.virtual('isFull').get(function () {
  if (this.capacity === 0) return false;
  return (this.attendees ? this.attendees.length : 0) >= this.capacity;
});

eventSchema.set('toJSON',   { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
