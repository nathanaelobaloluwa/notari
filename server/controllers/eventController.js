const Event = require('../models/Event');
const { sendTicketConfirmation } = require('../utils/mailer');

// GET /api/events/mine - List only the logged-in admin's events
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.admin.id }).sort({ date: 1 });
    res.json({ count: events.length, events });
  } catch (err) {
    console.error('[Event Controller Error - getMyEvents]', err);
    res.status(500).json({ error: 'Unable to load your events. Please retry.' });
  }
};

// GET /api/events - List all events with optional filters
exports.getEvents = async (req, res) => {
  try {
    const { faculty, timeframe, search, includePast } = req.query;
    let query = {};

    if (faculty && faculty !== 'All') {
      query.faculty = new RegExp('^' + faculty + '$', 'i');
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { eventName: searchRegex },
        { organizer: searchRegex },
        { venue: searchRegex },
        { description: searchRegex }
      ];
    }

    if (timeframe === 'this_week') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(startOfDay);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      query.date = { $gte: startOfDay, $lte: endOfWeek };
    } else if (timeframe === 'today') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query.date = { $gte: startOfDay, $lt: endOfDay };
    } else if (includePast !== 'true') {
      const now = new Date();
      query.date = { $gte: now };
    }

    const events = await Event.find(query).sort({ date: 1 });
    res.json({ count: events.length, events });
  } catch (err) {
    console.error('[Event Controller Error - getEvents]', err);
    res.status(500).json({ error: 'Unable to load notice board events. Please retry.' });
  }
};

// GET /api/events/:id - Get single event
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ event });
  } catch (err) {
    console.error('[Event Controller Error - getEventById]', err);
    res.status(500).json({ error: 'Unable to retrieve event details.' });
  }
};

// POST /api/events - Create new event (Admin only)
exports.createEvent = async (req, res) => {
  try {
    const { eventName, organizer, faculty, date, venue, description, contact, capacity } = req.body;

    if (!eventName || !organizer || !date || !venue) {
      return res.status(400).json({
        error: 'Event name, organizer, date, and venue are required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'A flyer image is required to post an event.'
      });
    }

    const flyerUrl = `/uploads/${req.admin.id}/${Date.now()}_${req.file.originalname}`;

    const newEvent = new Event({
      eventName: eventName.trim(),
      organizer: organizer.trim(),
      faculty: faculty ? faculty.trim() : 'General',
      date: new Date(date),
      venue: venue.trim(),
      description: description ? description.trim() : '',
      contact: contact ? contact.trim() : '',
      capacity: Number(capacity) >= 0 ? Number(capacity) : 0,
      flyerUrl,
      createdBy: req.admin.id
    });

    const savedEvent = await newEvent.save();
    res.status(201).json({
      message: 'Event pinned to notice board successfully.',
      event: savedEvent
    });
  } catch (err) {
    console.error('[Event Controller Error - createEvent]', err);
    res.status(500).json({ error: 'Unable to create event. Please check inputs and retry.' });
  }
};

// PUT /api/events/:id - Edit event (Admin only)
exports.updateEvent = async (req, res) => {
  try {
    const { eventName, organizer, faculty, date, venue, description, contact, capacity } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isOwner = event.createdBy && event.createdBy.toString() === req.admin.id;
    if (req.admin.role !== 'superadmin' && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to edit this event.' });
    }

    if (eventName) event.eventName = eventName.trim();
    if (organizer) event.organizer = organizer.trim();
    if (faculty) event.faculty = faculty.trim();
    if (date) event.date = new Date(date);
    if (venue) event.venue = venue.trim();
    if (description !== undefined) event.description = description.trim();
    if (contact !== undefined) event.contact = contact.trim();
    if (capacity !== undefined) event.capacity = Math.max(0, Number(capacity));

    const updatedEvent = await event.save();
    res.json({
      message: 'Event updated successfully.',
      event: updatedEvent
    });
  } catch (err) {
    console.error('[Event Controller Error - updateEvent]', err);
    res.status(500).json({ error: 'Unable to update event. Please retry.' });
  }
};

// DELETE /api/events/:id - Delete event (Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isOwner = event.createdBy && event.createdBy.toString() === req.admin.id;
    if (req.admin.role !== 'superadmin' && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to delete this event.' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event unpinned and deleted from notice board.' });
  } catch (err) {
    console.error('[Event Controller Error - deleteEvent]', err);
    res.status(500).json({ error: 'Unable to delete event. Please retry.' });
  }
};

// POST /api/events/:id/register - Book a seat or join waitlist
exports.registerForEvent = async (req, res) => {
  try {
    const { name, email, joinWaitlist } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Please provide both your name and email address.'
      });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        error: 'This event has already taken place.'
      });
    }

    // Check for duplicate booking
    const alreadyBooked = event.attendees.some(a => a.email.toLowerCase() === trimmedEmail);
    if (alreadyBooked) {
      return res.status(400).json({
        error: "You're already registered for this event."
      });
    }

    // Check capacity: if capacity > 0 and attendees count >= capacity
    const isFull = event.capacity > 0 && event.attendees.length >= event.capacity;

    if (isFull) {
      if (joinWaitlist) {
        const onWaitlist = event.waitlist.some(w => w.email.toLowerCase() === trimmedEmail);
        if (onWaitlist) {
          return res.status(400).json({
            error: "You're already registered for this event."
          });
        }
        event.waitlist.push({ name: trimmedName, email: trimmedEmail, joinedAt: new Date() });
        await event.save();
        return res.json({
          status: 'waitlisted',
          message: "You're on the waitlist — we'll notify you if a seat opens up."
        });
      } else {
        return res.status(400).json({
          status: 'full',
          error: "Event full — join the waitlist"
        });
      }
    }

    // Register attendee
    const ticketCode = 'NTR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newAttendee = {
      name: trimmedName,
      email: trimmedEmail,
      ticketCode,
      bookedAt: new Date()
    };

    event.attendees.push(newAttendee);
    await event.save();

    // Send confirmation email asynchronously via nodemailer
    const emailResult = await sendTicketConfirmation({
      attendeeEmail: trimmedEmail,
      attendeeName: trimmedName,
      event,
      ticketCode
    });

    res.json({
      status: 'confirmed',
      message: "You're in — check your email for your ticket.",
      ticket: {
        ticketCode,
        eventName: event.eventName,
        date: event.date,
        venue: event.venue,
        organizer: event.organizer,
        attendeeName: trimmedName,
        attendeeEmail: trimmedEmail,
        emailPreviewUrl: emailResult.previewUrl || null
      },
      seatsLeft: event.capacity > 0 ? Math.max(0, event.capacity - event.attendees.length) : null
    });
  } catch (err) {
    console.error('[Event Controller Error - registerForEvent]', err);
    res.status(500).json({ error: 'Registration failed. Please retry in a moment.' });
  }
};

// GET /api/events/:id/attendees - View attendees (Admin only)
exports.getAttendees = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({
      eventName: event.eventName,
      capacity: event.capacity,
      attendees: event.attendees,
      waitlist: event.waitlist
    });
  } catch (err) {
    console.error('[Event Controller Error - getAttendees]', err);
    res.status(500).json({ error: 'Unable to retrieve attendee list.' });
  }
};
