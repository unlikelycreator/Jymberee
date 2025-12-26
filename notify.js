import mongoose from 'mongoose';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/user.model.js'; // Adjust path if needed
import ConnectDB from './config/index.js'; // Import your DB connection

// Resolve project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname); // Ensures C:\clientsystems\Jymberre

// Load environment variables from project root
dotenv.config({ path: path.join(projectRoot, '.env') });

// Validate MONGO_URI
if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}
if (!process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  console.error('Error: MONGO_URI must start with "mongodb://" or "mongodb+srv://"');
  process.exit(1);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(path.join(projectRoot, 'serviceAccountKey.json')),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

async function sendPromotionalNotification() {
  try {
    // Check if MongoDB is already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected:', mongoose.connection.host);
    } else {
      console.log('Attempting to connect to MongoDB with URI:', process.env.MONGO_URI.replace(/:.*@/, ':****@')); // Mask password
      await ConnectDB();
    }

    // Fetch all users
    const users = await User.find({});
    if (!users.length) {
      console.log('No users found in database');
      return { success: false, message: 'No users found' };
    }

    // Extract valid FCM tokens
    const tokens = users
      .map((user) => user.fcmToken)
      .filter((token) => token && token.trim() !== '');
    if (!tokens.length) {
      console.log('No valid FCM tokens found');
      return { success: false, message: 'No valid FCM tokens found' };
    }

    // Prepare notification payload
    const payload = {
      notification: {
        title: 'Refer & Earn!',
        body: 'Refer and earn up to Rs 100! Open Jymberee and get started.',
      },
      data: {
        type: 'promotional',
        createdAt: new Date().toISOString(),
      },
    };

    // Split tokens into batches of 500 (Firebase limit)
    const chunkSize = 500;
    const failedTokens = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const tokenBatch = tokens.slice(i, i + chunkSize);
      try {
        const response = await admin
          .messaging()
          .sendEachForMulticast({ tokens: tokenBatch, ...payload });

        // Log and handle failures
        if (response.failureCount > 0) {
          response.responses.forEach((res, index) => {
            if (!res.success) {
              console.error(`Failed token: ${tokenBatch[index]} | Error: ${res.error.message}`);
              failedTokens.push(tokenBatch[index]);
            }
          });
        }
      } catch (batchError) {
        console.error('Batch Notification Error:', batchError);
      }
    }

    // Clear failed FCM tokens
    if (failedTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: failedTokens } },
        { $unset: { fcmToken: '' } }
      );
      console.log(`Cleared ${failedTokens.length} failed FCM tokens`);
    }

    // Store notifications in User model
    for (const user of users) {
      try {
        await User.updateOne(
          { _id: user._id },
          {
            $push: {
              notifications: {
                $each: [{
                  title: payload.notification.title,
                  message: payload.notification.body,
                  type: 'promotional',
                  mark_as_read: 0, // 0 for unseen
                  createdAt: new Date(),
                }],
                $slice: -5, // Keep only the latest 5 notifications
              },
            },
          }
        );
        console.log(`Notification stored for user ${user._id}`);
      } catch (saveError) {
        console.error(`Failed to store notification for user ${user._id}:`, saveError);
      }
    }

    console.log(`Notifications sent to ${tokens.length} users`);
    return { success: true, message: `Notifications sent to ${tokens.length} users`, failedTokens };
  } catch (error) {
    console.error('Promotional Notification Error:', error);
    return { success: false, message: error.message };
  }
}

// Run the script
(async () => {
  try {
    const result = await sendPromotionalNotification();
    console.log(result);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(result.success ? 0 : 1);
  }
})();