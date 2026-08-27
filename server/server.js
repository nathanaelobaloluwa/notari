require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./utils/db');
const seedData = require('./utils/seed');

const eventRoutes = require('./routes/events');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');
const requireAdmin = require('./middleware/requireAdmin');
const authController = require('./controllers/authController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const clientPath = path.join(__dirname, '..', 'client');
const uploadsPath = path.join(__dirname, 'uploads');
// Legacy compatibility for previously disk-stored uploads.
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(clientPath));

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// Alias for the pending-request count endpoint so it is reachable at the
// exact spec'd path /api/admin-requests/count as well as /api/admin/requests/count.
app.get('/api/admin-requests/count', requireAdmin, requireAdmin.requireSuperAdmin, authController.getPendingRequestsCount);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Direct HTML page fallbacks
app.get('/admin', (req, res) => {
  res.sendFile(path.join(clientPath, 'admin.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(clientPath, 'register.html'));
});

// Connect to Database & Start Server
async function startServer() {
  try {
    await connectDB();
    await seedData();

    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  NOTARI — Campus Event Notice Board is running!`);
      console.log(`  Local URL:  http://localhost:${PORT}`);
      console.log(`  Admin view: http://localhost:${PORT}/admin.html`);
      console.log(`======================================================\n`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start NOTARI server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
