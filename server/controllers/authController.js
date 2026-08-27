const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendAdminAccessRequestNotification } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'notari_jwt_secret_dev_key_2026';

// POST /api/auth/signup — Creates a pending admin access request
exports.signup = async (req, res) => {
  try {
    const { username, password, clubName, email, referenceLink } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        error: 'Username, password, and email are all required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'An identification image is required to request admin access.'
      });
    }

    const identificationUrl = `/uploads/identification/${req.file.filename}`;

    const trimmedUsername = username.toLowerCase().trim();
    const trimmedEmail = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    const existing = await Admin.findOne({
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }]
    });
    if (existing) {
      return res.status(409).json({
        error: 'A request with that username or email already exists. Please log in.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      username: trimmedUsername,
      passwordHash,
      clubName: clubName ? clubName.trim() : '',
      email: trimmedEmail,
      referenceLink: referenceLink ? referenceLink.trim() : '',
      identificationUrl,
      status: 'pending',
      role: 'admin'
    });

    res.status(201).json({
      message: 'Admin access request submitted. A superadmin will review and approve your account.',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        clubName: newAdmin.clubName,
        email: newAdmin.email,
        status: newAdmin.status,
        role: newAdmin.role
      }
    });

    sendAdminAccessRequestNotification({
      applicantUsername: newAdmin.username,
      applicantEmail: newAdmin.email,
      clubName: newAdmin.clubName
    }).catch(err => {
      console.error('[Mailer] Background notification failed:', err.message);
    });
  } catch (err) {
    console.error('[Auth Controller Error - signup]', err);
    res.status(500).json({
      error: 'Server error during registration. Please retry.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Please provide both username and password.'
      });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({
        error: 'Invalid credentials. Check your username and password.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials. Check your username and password.'
      });
    }

    if (admin.status === 'pending') {
      return res.status(403).json({
        error: 'pending approval',
        message: 'Your admin account is pending approval. A superadmin will review your request shortly.'
      });
    }

    if (admin.status === 'rejected') {
      return res.status(403).json({
        error: 'Account rejected',
        message: 'Your admin access request has been rejected. Contact a superadmin for more information.'
      });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role, status: admin.status },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Logged in successfully.',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        clubName: admin.clubName,
        email: admin.email,
        referenceLink: admin.referenceLink,
        status: admin.status,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth Controller Error]', err);
    res.status(500).json({
      error: 'Server error during authentication. Please retry.'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-passwordHash');
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }
    res.json({ admin });
  } catch (err) {
    res.status(500).json({ error: 'Server error retrieving admin profile.' });
  }
};

// GET /api/admin/requests/count — Count of pending admin access requests (Superadmin only)
exports.getPendingRequestsCount = async (req, res) => {
  try {
    const pending = await Admin.countDocuments({ status: 'pending' });
    res.json({ pending });
  } catch (err) {
    console.error('[Auth Controller Error - getPendingRequestsCount]', err);
    res.status(500).json({ error: 'Unable to retrieve pending request count.' });
  }
};

// GET /api/admin/pending-requests — List all pending admin access requests (Superadmin only)
exports.getPendingRequests = async (req, res) => {
  try {
    const pendingAdmins = await Admin.find({ status: 'pending' })
      .select('-passwordHash')
      .sort({ createdAt: 1 });
    res.json({ requests: pendingAdmins });
  } catch (err) {
    console.error('[Auth Controller Error - getPendingRequests]', err);
    res.status(500).json({ error: 'Unable to retrieve pending access requests.' });
  }
};

// PATCH /api/admin/requests/:id/approve — Approve a pending admin request (Superadmin only)
exports.approveRequest = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin request not found.' });
    }

    if (admin.status !== 'pending') {
      return res.status(400).json({
        error: 'This request has already been processed.'
      });
    }

    admin.status = 'approved';
    await admin.save();

    res.json({
      message: `Admin request for "${admin.username}" has been approved.`,
      admin: {
        id: admin._id,
        username: admin.username,
        clubName: admin.clubName,
        email: admin.email,
        referenceLink: admin.referenceLink,
        identificationUrl: admin.identificationUrl,
        status: admin.status,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth Controller Error - approveRequest]', err);
    res.status(500).json({ error: 'Unable to approve request.' });
  }
};

// PATCH /api/admin/requests/:id/reject — Reject a pending admin request (Superadmin only)
exports.rejectRequest = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin request not found.' });
    }

    if (admin.status !== 'pending') {
      return res.status(400).json({
        error: 'This request has already been processed.'
      });
    }

    admin.status = 'rejected';
    await admin.save();

    res.json({
      message: `Admin request for "${admin.username}" has been rejected.`,
      admin: {
        id: admin._id,
        username: admin.username,
        clubName: admin.clubName,
        email: admin.email,
        referenceLink: admin.referenceLink,
        identificationUrl: admin.identificationUrl,
        status: admin.status,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth Controller Error - rejectRequest]', err);
    res.status(500).json({ error: 'Unable to reject request.' });
  }
};
