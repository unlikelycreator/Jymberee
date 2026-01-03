import { User } from "../../models/user.model.js";
import { Sos } from "../../models/sos.model.js";
import axios from "axios";
const fs = require("fs");
const path = require("path");
import FormData from "form-data";

const IMAGE_DIR = "/var/www/images";
const BASE_URL = "https://tapis-one.com/images";
const DEFAULT_IMAGE_URL = "https://cdn.fileshare.ing/production/morcq4c2iq.jpeg";

/* -------------------------------------------------------------
   GLOBAL SOS LOCK — avoids processing SOS twice
------------------------------------------------------------- */
const sendingSOS = new Map();

function acquireSOSLock(userId, ttl = 30000) {
  if (sendingSOS.has(userId)) return false;
  sendingSOS.set(userId, true);
  setTimeout(() => sendingSOS.delete(userId), ttl).unref();
  return true;
}

function releaseSOSLock(userId) {
  sendingSOS.delete(userId);
}

/* -------------------------------------------------------------
   GLOBAL WHATSAPP LOCK — ensures WA message sent only once
------------------------------------------------------------- */
const whatsappLock = new Map();

function acquireWhatsAppLock(userId, ttl = 30000) {
  if (whatsappLock.has(userId)) {
    console.log("WhatsApp lock active → skipping duplicate");
    return false;
  }
  whatsappLock.set(userId, true);
  setTimeout(() => whatsappLock.delete(userId), ttl).unref();
  return true;
}

/* -------------------------------------------------------------
   Reverse Geocode to Address (OpenStreetMap)
------------------------------------------------------------- */
async function getAddressFromCoordinates(latitude, longitude) {
  console.log(latitude, longitude)
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

  try {
    const response = await axios.get(url);
    return response.data.display_name || "Unknown Location";
  } catch (error) {
    console.error("Error fetching address:", error.message);
    return "Location unavailable";
  }
}

/* -------------------------------------------------------------
   Upload Base64 Image (Tapis)
------------------------------------------------------------- */
async function uploadBase64Image(image, token, userId) {
  if (!image) return DEFAULT_IMAGE_URL;

  // Validate & extract
  const match = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid Base64 image format");

  const ext = match[1].toLowerCase();
  const supported = ["jpeg", "jpg", "png", "gif"];
  if (!supported.includes(ext)) throw new Error("Unsupported image type");

  const base64Data = match[2];

  // 🔥 New naming schema: jym-userId-timestamp.ext
  const fileName = `jym-${userId}-${Date.now()}.${ext}`;
  const filePath = path.join(IMAGE_DIR, fileName);

  // Write file to disk
  await fs.promises.writeFile(filePath, base64Data, "base64");

  // Ensure web server can read it
  await fs.promises.chmod(filePath, 0o644);

  // Public URL
  const imageUrl = `${BASE_URL}/images/${fileName}`;

  return imageUrl;
}

/* -------------------------------------------------------------
   Send WhatsApp via BHASH — RAW mode (no encoding)
------------------------------------------------------------- */
async function sendBhashWhatsAppMessage(phoneNumber, params, mediaUrl) {
  const BASE_URL = "https://bhashsms.com/api/sendmsgutil.php";
  const USER = "SR_BWUAI";
  const PASS = "123456";
  const SENDER = "BUZWAP";
  const TEMPLATE = "sos_alert_final";

  const cleanPhone = String(phoneNumber).replace(/\D/g, "").replace(/^91/, "");

  const [name, contact, address, lat, lng, message] = params.map(x => String(x));

  const paramsString = `${name},${contact},${address},${lat},${lng},${message}`;

  const url =
    `${BASE_URL}?user=${USER}` +
    `&pass=${PASS}` +
    `&sender=${SENDER}` +
    `&phone=91${cleanPhone}` +
    `&text=${TEMPLATE}` +
    `&priority=wa` +
    `&stype=normal` +
    `&Params=${paramsString}` +
    (mediaUrl ? `&htype=image&url=${mediaUrl}` : "");

  try {
    const res = await axios.get(url, { timeout: 20000 });
    const text = String(res.data || "").trim();
    const [status, id] = text.split("|");

    return status === "SUCCESS"
      ? { ok: true, id, raw: text }
      : { ok: false, raw: text };
  } catch (err) {
    console.error("WHATSAPP ERROR:", err.message);
    return { ok: false, raw: err.message };
  }
}

/* -------------------------------------------------------------
   MAIN CONTROLLER — Upload + Save SOS + Send WhatsApp
------------------------------------------------------------- */
const UploadImageBase64 = async (req, res) => {
  const userId = req.user._id;

  if (!acquireSOSLock(userId)) {
    return res.status(429).json({ error: "SOS already processing" });
  }

  try {
    const { image, latitude, longitude, description } = req.body;
    const user = await User.findById(userId);

    if (!user) throw new Error("User not found");

    const token = req.headers.authorization?.split(" ")[1];
    const imageUrl = await uploadBase64Image(image, token, userId);

    await User.updateOne(
      { _id: userId },
      { $push: { images: { url: imageUrl, uploadedAt: new Date() } } }
    );

    let sos = null;
    if (latitude && longitude) {
      await Sos.deleteOne({ userId });
      sos = await Sos.create({
        userId,
        latitude,
        longitude,
        description: description || "",
        timestamp: new Date(),
      });
    }

    const fullAddress = await getAddressFromCoordinates(latitude, longitude);
    console.log(fullAddress)
    const formattedAddress = fullAddress.replace(/,/g, " ").trim();

    const params = [
      user.name || "Unknown User",
      user.phoneNumber?.replace(/\D/g, "") || "",
      formattedAddress,
      String(latitude),
      String(longitude),
      description || "Emergency SOS triggered",
    ];

    const contacts = [
      ...new Map((user.emergencyContacts || []).map(c => [c.number.trim(), c])).values(),
    ];

    if (acquireWhatsAppLock(userId)) {
      for (const c of contacts) {
        await sendBhashWhatsAppMessage(c.number, params, imageUrl);
      }
    }

    return res.status(200).json({
      message: "SOS created successfully",
      imageUrl,
      sos,
    });
  } catch (err) {
    console.error("SOS ERROR:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    releaseSOSLock(userId);
  }
};

/* -------------------------------------------------------------
   Get User Images
------------------------------------------------------------- */
const GetUserImages = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("images");
    if (!user) throw new Error("User not found");

    return res.json({ images: user.images || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/* -------------------------------------------------------------
   Upload Profile Picture
------------------------------------------------------------- */
const UploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const token = req.headers.authorization?.split(" ")[1];
    const profilePictureUrl = await uploadBase64Image(req.body.image, token, userId);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select("-password");

    return res.json({
      message: "Profile picture uploaded",
      profilePicture: profilePictureUrl,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { UploadImageBase64, GetUserImages, UploadProfilePicture };
