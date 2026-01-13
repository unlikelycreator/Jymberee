import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import admin from "firebase-admin";

import { User } from "../../models/user.model.js";
import { Sos } from "../../models/sos.model.js";

/* ─────────────────────────────────────────────
   Firebase Admin Initialization (SAFE)
───────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../serviceAccountKey.json"),
    "utf8"
  )
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const INVALID_FCM_ERRORS = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

const getPostalCodeFromLatLng = async (latitude, longitude) => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: "json",
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "Jymberee/1.0 (support@jymberee.com)",
        },
        timeout: 5000,
      }
    );

    return response.data?.address?.postcode || null;
  } catch (err) {
    console.error("Postal lookup failed:", err.message);
    return null;
  }
};

/* ─────────────────────────────────────────────
   Core Notification Logic
───────────────────────────────────────────── */

const sendNotifications = async (
  senderId,
  title,
  message,
  sosData,
  latitude,
  longitude,
  env = "test"
) => {
  try {
    let users = [];

    /* ─────────────── TEST MODE ─────────────── */
    if (env === "test") {
      console.log("test notofication")
      const testUserIds = [
        new mongoose.Types.ObjectId("6937092c1b88d1118ef567d0"),
        new mongoose.Types.ObjectId("69370f8e1b88d1118ef567f1"),
        new mongoose.Types.ObjectId("696227a45294dc6ac855b5e0")
      ];

      users = await User.find({
        _id: { $in: testUserIds },
        fcmToken: { $exists: true, $ne: null, $ne: "" },
      });

      if (!users.length) {
        return { success: false, message: "No test users with FCM tokens" };
      }

      console.log("🧪 TEST MODE: Sending to", users.length, "users");
    }

    /* ────────────── PROD MODE ─────────────── */
    else {
      console.log("prod notofication")
      const postalCode = await getPostalCodeFromLatLng(latitude, longitude);

      if (!postalCode) {
        return {
          success: false,
          message: "Unable to determine postal code",
        };
      }

      users = await User.find({
        _id: { $ne: senderId },
        postalCode,
        fcmToken: { $exists: true, $ne: null, $ne: "" },
      });

      if (!users.length) {
        return { success: false, message: "No users found in this area" };
      }
    }

    const validTokens = users.map(u => u.fcmToken);

    if (!validTokens.length) {
      return { success: false, message: "No valid FCM tokens found" };
    }

    /* ────────────── FCM PAYLOAD ────────────── */
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

    let successCount = 0;
    const invalidTokens = [];

    /* ────────────── SEND IN BATCHES ────────────── */
    for (let i = 0; i < validTokens.length; i += 500) {
      const batch = validTokens.slice(i, i + 500);

      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        ...payload,
      });

      successCount += response.successCount;

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          console.error("FCM failure:", code);

          if (INVALID_FCM_ERRORS.includes(code)) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    }

    /* ────────────── CLEAN INVALID TOKENS ────────────── */
    if (invalidTokens.length) {
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $unset: { fcmToken: "" } }
      );
    }

    /* ────────────── SAVE NOTIFICATIONS ────────────── */
    const notificationPayload = {
      title,
      message,
      senderId,
      sos: sosData.map(s => s._id),
      latitude,
      longitude,
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

    return { success: true, successCount };
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, message: error.message };
  }
};

/* ─────────────────────────────────────────────
   Controllers
───────────────────────────────────────────── */

const Notification = async (req, res) => {
  const { title, message, latitude, longitude, env } = req.body;
  const senderId = req.user._id;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  try {
    const sos = await Sos.find({ userId: senderId }).populate(
      "userId",
      "profilePicture name phoneNumber email"
    );

    const result = await sendNotifications(
      senderId,
      title,
      message,
      sos,
      latitude,
      longitude,
      env
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Notification Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getNotifications = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId, {
      notifications: { $slice: -5 },
    })
      .populate("notifications.senderId", "name profilePicture")
      .populate("notifications.sos");

    return res.status(200).json({
      success: true,
      notifications: user.notifications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  await User.updateOne(
    { _id: userId },
    { $pull: { notifications: { _id: notificationId } } }
  );

  return res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
};

const deleteAllNotifications = async (req, res) => {
  const userId = req.user._id;

  await User.updateOne(
    { _id: userId },
    { $set: { notifications: [] } }
  );

  return res.status(200).json({
    success: true,
    message: "All notifications deleted successfully",
  });
};

const markAsRead = async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  await User.updateOne(
    { _id: userId, "notifications._id": notificationId },
    { $set: { "notifications.$.mark_as_read": 1 } }
  );

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
  });
};

export {
  Notification,
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
  markAsRead,
};
