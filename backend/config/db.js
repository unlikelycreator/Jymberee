// config/db.js
import mongoose from 'mongoose';

const LOCAL_URI = process.env.LOCAL_URI?.trim();
const DB_NAME = process.env.DB_NAME;

if (!LOCAL_URI || !DB_NAME) {
  throw new Error('LOCAL_URI and DB_NAME are required in .env');
}

let isConnected = false;

async function connectWithRetry(maxAttempts = 5) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const conn = await mongoose.connect(`${LOCAL_URI}/${DB_NAME}`, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });
      isConnected = true;
      console.log(`Local MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(`Attempt ${i} failed:`, err.message);
      if (i === maxAttempts) throw err;
      await new Promise(res => setTimeout(res, 1000 * i));
    }
  }
}

export default async function ConnectDB() {
  if (isConnected) return mongoose.connection;
  return await connectWithRetry();
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB disconnected on app termination');
  process.exit(0);
});