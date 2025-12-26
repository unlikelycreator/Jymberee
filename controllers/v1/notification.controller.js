import { User } from "../../models/user.model.js";
import { Sos } from "../../models/sos.model.js";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert('../serviceAccountKey.json'),
  });
}

const sendNotifications = async (senderId, title, message, sosData, latitude, longitude) => {
  try {
    // Fetch all users, excluding sender
    const users = await User.find({
      _id: { $ne: senderId },
    });

    // Extract valid FCM tokens
    const tokens = users.map((user) => user.fcmToken).filter((token) => token && token.trim() !== "");

    if (tokens.length === 0) {
      console.log("No users to notify");
      return { success: false, message: "No users to notify" };
    }

    // Prepare notification payload
    const payload = {
      notification: {
        title: title || "New SOS Alert",
        body: message || "Emergency alert in your area!",
      },
      data: {
        senderId: senderId.toString(),
        sos: JSON.stringify(sosData),
        latitude: latitude ? latitude.toString() : "",
        longitude: longitude ? longitude.toString() : "",
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
              console.error(
                `Failed token: ${tokenBatch[index]} | Error: ${res.error}`
              );
              failedTokens.push(tokenBatch[index]);
            }
          });
        }
      } catch (batchError) {
        console.error("Batch Notification Error:", batchError);
      }
    }

    // Clear failed FCM tokens
    if (failedTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: failedTokens } },
        { $unset: { fcmToken: "" } }
      );
    }

    // Store notifications in User model with latitude and longitude
    for (const user of users) {
      try {
        await User.updateOne(
          { _id: user._id },
          {
            $push: {
              notifications: {
                $each: [{
                  title,
                  message,
                  senderId,
                  sos: sosData.map(s => s._id), // Store SOS ObjectIds
                  latitude: latitude || null,
                  longitude: longitude || null,
                  mark_as_read: 0, // 0 for unseen
                  createdAt: new Date(),
                }],
                $slice: -5, // Keep only the latest 5 notifications
              },
            },
          }
        );
        console.log(`Notification added to user ${user._id}`);
      } catch (saveError) {
        console.error(`Failed to save notification for user ${user._id}:`, saveError);
      }
    }

    return { success: true, message: "Notifications sent successfully", failedTokens };
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, message: error.message };
  }
};

const Notification = async (req, res) => {
  const { title, message, latitude, longitude } = req.body;
  const senderId = req.user._id;

  console.log(`Notification endpoint called by user ${senderId} at ${new Date().toISOString()}`);

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
      longitude
    );

    if (!result.success) {
      return res.status(200).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent successfully to ${result.tokensSent || 0} user(s)`,
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