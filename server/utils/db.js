const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    const host = mongoose.connection.host;
    console.log(`[DB] Connected to MongoDB Atlas (${host})`);
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    throw err;
  }
}

async function closeDB() {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed.');
}

module.exports = { connectDB, closeDB };
