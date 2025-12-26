import { User } from "../../models/user.model.js";
import { Sos } from "../../models/sos.model.js";
import admin from "firebase-admin";
import axios from 'axios'
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert('../serviceAccountKey.json'),
  });
}

const getPostalCodeFromLatLng = async (latitude, longitude) => {
  const url = "https://nominatim.openstreetmap.org/reverse";

  const response = await axios.get(url, {
    params: {
      lat: latitude,
      lon: longitude,
      format: "json",
      addressdetails: 1,
    },
    headers: {
      "User-Agent": "YourAppName/1.0 (your@email.com)", // REQUIRED
    },
    timeout: 5000,
  });

  return response.data?.address?.postcode || null;
};

const sendNotifications = async (
  senderId,
  title,
  message,
  sosData,
  latitude,
  longitude,
  env = "prod" // ← Default to prod if not provided
) => {
  try {
    let users = [];

    if (env === "test") {
      // In test mode: send to these 3 specific test users
      const testUserIds = [
        "6937092c1b88d1118ef567d0", 
        "69370f8e1b88d1118ef567f1",  
        "693842bce7089d4e628d5173",
        "693933b5e7089d4e628d524e"     
      ];

      const testUsers = await User.find({ _id: { $in: testUserIds } });

      if (testUsers.length === 0) {
        console.log("🧪 TEST MODE: None of the test users found in database.");
        return { success: false, message: "No test users found" };
      }

      users = testUsers;

      console.log("🧪 TEST MODE: Sending SOS notification to test users:");
      testUsers.forEach(user => {
        console.log(`- ${user.name || 'Test User'} (ID: ${user._id})`);
      });
      console.log(`Total recipients: ${testUsers.length}\n`);
    } else {
      // Production mode: normal flow with postal code
      const postalCode = await getPostalCodeFromLatLng(latitude, longitude);
      if (!postalCode) {
        return {
          success: false,
          message: "Unable to determine postal code from location",
        };
      }

      // Fetch users in same postal code (excluding sender)
      users = await User.find({
        _id: { $ne: senderId },
        postalCode: postalCode,
      });

      // Logging
      console.log("Sending SOS notification to the following users:");
      users.forEach(user => {
        console.log(`- ${user.name || 'Unknown Name'} (ID: ${user._id}, Postal Code: ${postalCode})`);
      });
      console.log(`Total recipients: ${users.length}\n`);

      if (!users.length) {
        return { success: false, message: "No users found in this area" };
      }
    }

    // Extract valid FCM tokens
    const validTokens = users
      .map(u => u.fcmToken)
      .filter(t => t && t.trim() !== "");

    if (!validTokens.length) {
      return { success: false, message: "No valid FCM tokens found" };
    }

    let successCount = 0;
    const failedTokens = [];

    // FCM payload (unchanged)
    const payload = {
      notification: {
        title: title || "New SOS Alert",
        body: message || "Emergency alert in your area!",
      },
      data: {
        senderId: senderId.toString(),
        sos: JSON.stringify(sosData.map(s => ({ _id: s._id }))),
        latitude: latitude?.toString() || "",
        longitude: longitude?.toString() || "",
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "sos_channel",
          sound: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
    };

    // Send in batches of 500
    for (let i = 0; i < validTokens.length; i += 500) {
      const batch = validTokens.slice(i, i + 500);
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        ...payload,
      });
      successCount += response.successCount;
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          failedTokens.push(batch[idx]);
          console.error("Failed token:", batch[idx], res.error?.message);
        }
      });
    }

    // Remove invalid tokens from DB
    if (failedTokens.length) {
      await User.updateMany(
        { fcmToken: { $in: failedTokens } },
        { $unset: { fcmToken: "" } }
      );
    }

    // Save notification to each recipient's DB record
    const notificationPayload = {
      title,
      message,
      senderId,
      sos: sosData.map(s => s._id),
      latitude: latitude || null,
      longitude: longitude || null,
      mark_as_read: 0,
      createdAt: new Date(),
    };

    for (const user of users) {
      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            notifications: {
              $each: [notificationPayload],
              $slice: -5,
            },
          },
        }
      );
    }

    return {
      success: true,
      successCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, message: error.message };
  }
};


const Notification = async (req, res) => {
  const { title, message, latitude, longitude, env } = req.body; // ← Added env
  const senderId = req.user._id;

  try {
    // Validate lat/long
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
    }

    // Fetch sender's SOS data
    const sos = await Sos.find({ userId: senderId }).populate({
      path: "userId",
      select: "profilePicture name phoneNumber email",
    });

    // Send notifications and store them in the database
    const result = await sendNotifications(
      senderId,
      title,
      message,
      sos,
      latitude,
      longitude,
      env // ← Pass env to sendNotifications
    );

    if (!result.success) {
      return res.status(200).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent successfully to ${result.successCount || 0} user(s)`,
      failedTokens: result.failedTokens || [],
    });
  } catch (error) {
    console.error("Notification Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getNotifications = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId, { notifications: { $slice: -5 } })
      .populate('notifications.senderId', 'name profilePicture')
      .populate('notifications.sos')
      .exec();

    return res.status(200).json({
      success: true,
      notifications: user.notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const notificationExists = user.notifications.some(n => n._id.toString() === notificationId);
    if (!notificationExists) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { notifications: { _id: notificationId } } }
    );

    return res.status(200).json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAllNotifications = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await User.updateOne(
      { _id: userId },
      { $set: { notifications: [] } }
    );

    return res.status(200).json({ success: true, message: "All notifications deleted successfully" });
  } catch (error) {
    console.error("Delete All Notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const notification = user.notifications.find(n => n._id.toString() === notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    await User.updateOne(
      { _id: userId, "notifications._id": notificationId },
      { $set: { "notifications.$.mark_as_read": 1 } }
    );

    return res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark As Read Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { Notification, getNotifications, deleteNotification, deleteAllNotifications, markAsRead };