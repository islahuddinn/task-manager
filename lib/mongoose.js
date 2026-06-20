import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'taskmanager';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(retries = MAX_RETRIES) {
  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    dbName: DB_NAME,
    family: 4,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await mongoose.connect(MONGODB_URI, opts);
      return connection;
    } catch (error) {
      if (attempt < retries) {
        console.warn(`MongoDB connection attempt ${attempt} failed: ${error.message}. Retrying...`);
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw error;
      }
    }
  }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry()
      .then((mongoose) => {
        cached.conn = mongoose.connection;
        return cached.conn;
      })
      .catch((error) => {
        cached.promise = null;
        console.error('MongoDB connection failed after retries:', error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;