import { Sos } from "../../models/sos.model.js";
import { User } from "../../models/user.model.js";
import axios from "axios";
import { firebaseAdmin as admin } from "../../services/firebase-admin.js";

const getAddressFromCoordinates = async (latitude, longitude) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
  try {
    const response = await axios.get(url);
    return response.data.display_name || "Unknown Location";
  } catch (error) {
    console.error("Error fetching address:", error);
    return "Location unavailable";
  }
};

const sendWhatsAppMessage = async (phoneNumber, message) => {
  const sanitizedPhoneNumber = phoneNumber.replace("+", "");
  const url = `https://dealsms.in/api/send?number=${sanitizedPhoneNumber}&type=text&message=${encodeURIComponent(message)}&instance_id=${process.env.INSTANCE_ID}&access_token=${process.env.WHATSAPP_ACCESS_TOKEN}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Failed to send message to ${phoneNumber}:`, error);
  }
};

const sendNotifications = async (senderId, title, message, sosData) => {
  try {
    const users = await User.find({ _id: { $ne: senderId } });
    const tokens = users
      .map((user) => user.fcmToken)
      .filter((token) => token && token.trim() !== "");

    if (tokens.length === 0) {
      console.log("No users to notify");
      return { success: false, message: "No users to notify" };
    }

    const payload = {
      notification: {
        title: title || "New Notification",
        body: message || "You have a new message!",
      },
      data: {
        senderId: senderId.toString(),
        sos: JSON.stringify(sosData),
      },
    };

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const tokenBatch = tokens.slice(i, i + chunkSize);
      try {
        const response = await admin
          .messaging()
          .sendEachForMulticast({ tokens: tokenBatch, ...payload });

        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((res, index) => {
            if (!res.success) {
              console.error(
                `Failed token: ${tokenBatch[index]} | Error: ${res.error}`
              );
              failedTokens.push(tokenBatch[index]);
            }
          });
          await User.updateMany(
            { fcmToken: { $in: failedTokens } },
            { $unset: { fcmToken: "" } }
          );
        }
      } catch (batchError) {
        console.error("Batch Notification Error:", batchError);
      }
    }

    return { success: true, message: "Notifications sent successfully" };
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, message: error.message };
  }
};

const createSos = async (req, res) => {
  try {
    const { latitude, longitude, description } = req.body;

    await Sos.deleteOne({ userId: req.user._id });

    const sos = new Sos({
      latitude,
      longitude,
      description,
      timestamp: new Date(),
      userId: req.user._id,
    });
    await sos.save();

    const user = await User.findOne({ _id: req.user._id });
    const emergencyContacts = user.emergencyContacts;
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const address = await getAddressFromCoordinates(latitude, longitude);
    const message = `🚨 URGENT SOS ALERT 🚨\n\n🔹 *Name:* ${user.name
      }\n🔹 *Contact:* ${user.phoneNumber
      }\n🔹 *Location:* ${address}\n\n📍 *Live Location:* ${mapsLink}\n\n
    ✉️ *Message:* ${description ? description + "\n\n" : ""
      }⚠️ This person is in an emergency situation and needs immediate assistance. Please respond urgently.`;

    if (emergencyContacts.length > 0) {
      for (const phone of emergencyContacts) {
        const phoneNumber = phone.number;
        await sendWhatsAppMessage(phoneNumber, message);
      }
    }

    const notificationTitle = "🚨 URGENT SOS ALERT 🚨";
    const notificationMessage = `Emergency from ${user.name}: ${description || "No additional details provided."}. Location: ${address}. Check app for more info.`;

    const populatedSos = await Sos.find({ userId: req.user._id }).populate({
      path: "userId",
      select: "profilePicture name phoneNumber email",
    });

    const notificationResult = await sendNotifications(
      req.user._id,
      notificationTitle,
      notificationMessage,
      populatedSos,
      latitude,
      longitude
    );
    res.status(201).json({ message: "SOS created successfully", sosId: sos._id });
  } catch (error) {
    console.error("Error creating SOS:", error);
    res.status(500).json({ message: "Failed to create SOS." });
  }
};

const getSos = async (req, res) => {
  try {
    // Query the latest 3 SOS records, excluding the current user's SOS
    const activeSos = await Sos.find({
      userId: { $ne: req.user._id },
    })
      .sort({ timestamp: -1 }) // Sort by timestamp in descending order
      .limit(3) // Limit to 3 records
      .populate({
        path: "userId",
        select: "profilePicture name phoneNumber email",
      });
    if (activeSos.length === 0) {
      return res
        .status(200)
        .json({ message: "No SOS locations found." });
    }

    res.status(200).json({ locations: activeSos });
  } catch (error) {
    console.error("Error fetching SOS locations:", error);
    res.status(500).json({ message: "Failed to fetch SOS locations." });
  }
};

export default {
  createSos,
  getSos,
};