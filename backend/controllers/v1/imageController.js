import { User } from "../../models/user.model.js";
import { Sos } from "../../models/sos.model.js";
import axios from "axios";
import FormData from "form-data";

const DEFAULT_IMAGE_URL = "https://cdn.fileshare.ing/production/morcq4c2iq.jpeg";

/* -------------------------------------------------------------
   In-memory lock – prevents duplicate SOS sends for the same user
   ------------------------------------------------------------- */
const sendingSOS = new Map();   // userId → true

// Get readable address from lat/lng
const getAddressFromCoordinates = async (latitude, longitude) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
  try {
    const response = await axios.get(url);
    return response.data.display_name || "Unknown Location";
  } catch (error) {
    console.error("Error fetching address:", error.message);
    return "Location unavailable";
  }
};

async function sendBhashWhatsAppMessage(phoneNumber, params = [], mediaUrl) {
  const BASE_URL = "https://bhashsms.com/api/sendmsgutil.php";

  // Clean and validate phone
  let cleanPhone = String(phoneNumber || "").replace(/\D/g, "").trim();
  if (cleanPhone.startsWith("91") && cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(2);
  }
  if (cleanPhone.length !== 10) {
    console.error("Invalid phone number:", phoneNumber);
    return { error: "Phone must be 10 digits", code: "INVALID_PHONE" };
  }

  // Credentials
  const USER = "SR_BWUAI";
  const PASS = "123456";
  const SENDER = "BUZWAP";
  const TEMPLATE = "sos_alert_main";

  // Normalise to exactly 6 params
  const [name = "-", contact = "-", address = "", lat = "-", lng = "-", message = "-"] =
    Array.isArray(params) ? params.map(String) : [];

  const normalized = [name, contact, address, lat, lng, message].slice(0, 6);

  // Address → 6 parts, never empty
  const addressParts = (normalized[2] || "")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 6);
  while (addressParts.length < 6) addressParts.push("-");

  // 11 values – all filled
  const fullParams = [
    normalized[0] || "-",
    normalized[1] || "-",
    ...addressParts,
    normalized[3] || "-",
    normalized[4] || "-",
    normalized[5] || "-",
  ];

  const rawParams = fullParams.join(",");

  const finalUrl = [
    `${BASE_URL}?`,
    `user=${USER}`,
    `&pass=${PASS}`,
    `&sender=${SENDER}`,
    `&phone=${cleanPhone}`,
    `&text=${TEMPLATE}`,
    `&priority=wa`,
    `&stype=normal`,
    `&Params=${rawParams}`,
    mediaUrl ? `&htype=image&url=${mediaUrl}` : "",
  ].join("");

  try {
    const res = await axios.get(finalUrl, { timeout: 15000 });
    const text = (res.data || "").toString().trim();
    const [status, id] = text.split("|");

    if (status === "SUCCESS") {
      return { success: true, message_id: id, raw: text };
    } else {
      return { success: false, raw: text };
    }
  } catch (err) {
    console.error("Bhash request failed:", err.message);
    return { success: false, raw: err.message };
  }
}

/* -------------------------------------------------------------
   Upload SOS Image + Location + Send WhatsApp Alert
   ------------------------------------------------------------- */
const UploadImageBase64 = async (req, res) => {
  const userId = req.user._id;

  // ---- LOCK: prevent duplicate SOS sends ----
  if (sendingSOS.has(userId)) {
    return res.status(429).json({
      error: "SOS is already being sent. Please wait a moment.",
    });
  }
  sendingSOS.set(userId, true);   // acquire lock

  try {
    const { image, latitude, longitude, description } = req.body;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let imageUrl = DEFAULT_IMAGE_URL;

    // ---------- IMAGE UPLOAD ----------
    if (image && image !== "") {
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid Base64 image format" });
      }

      const extension = matches[1].toLowerCase();
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const allowedTypes = ["jpeg", "jpg", "png", "gif"];
      if (!allowedTypes.includes(extension)) {
        return res.status(400).json({ error: "Only jpeg, jpg, png, gif are allowed" });
      }

      const filename = `photo-${userId}-${Date.now()}.${extension}`;
      const formData = new FormData();
      formData.append("image", buffer, {
        filename,
        contentType: `image/${extension}`,
      });

      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const uploadEndpoint = "https://tapis-one.com/upload/";
      try {
        const uploadRes = await axios.post(uploadEndpoint, formData, {
          headers: {
            ...formData.getHeaders(),
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 60000,
        });

        if (uploadRes.data.fileUrl) {
          imageUrl = uploadRes.data.fileUrl;
        }
      } catch (err) {
        console.error("Image upload failed:", err.response?.data || err.message);

        if (err.response?.status === 400) {
          const retryFormData = new FormData();
          retryFormData.append("file", buffer, {
            filename,
            contentType: `image/${extension}`,
          });
          try {
            const retryRes = await axios.post(uploadEndpoint, retryFormData, {
              headers: {
                ...retryFormData.getHeaders(),
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
              timeout: 60000,
            });
            if (retryRes.data.fileUrl) {
              imageUrl = retryRes.data.fileUrl;
            }
          } catch (retryErr) {
            console.error("Retry upload failed:", retryErr.message);
          }
        }
      }

      // Save to gallery
      await User.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            images: {
              url: imageUrl,
              uploadedAt: new Date(),
            },
          },
        },
        { new: true }
      );
    }

    // ---------- SAVE SOS ----------
    let sos = null;
    if (latitude && longitude) {
      await Sos.deleteOne({ userId: req.user._id });
      sos = new Sos({
        latitude,
        longitude,
        description: description || "",
        timestamp: new Date(),
        userId: req.user._id,
      });
      await sos.save();
    }

    // ---------- WHATSAPP ALERT ----------
    const emergencyContacts = user.emergencyContacts || [];
    const messageStatus = [];

    if (emergencyContacts.length > 0 && latitude && longitude) {
      const fullAddress = await getAddressFromCoordinates(latitude, longitude);

      // Short address (city, state)
      let shortAddress = "Location unavailable";
      if (fullAddress && fullAddress !== "Unknown Location") {
        const parts = fullAddress.split(", ").filter(Boolean);
        shortAddress = parts.slice(-3, -1).join(", ") || parts[0];
      }

      const dynamicParams = [
        user.name || "Unknown User",
        (user.phoneNumber || "N/A").replace(/\D/g, "").replace(/^91/, ""),
        shortAddress,
        latitude?.toString() || "-",
        longitude?.toString() || "-",
        description || "Emergency SOS triggered!",
      ];

      for (const contact of emergencyContacts) {
        const result = await sendBhashWhatsAppMessage(contact.number, dynamicParams, imageUrl);

        if (result?.error) {
          messageStatus.push({
            number: contact.number,
            status: "failed",
            error: result.error,
            code: result.code,
          });
        } else {
          messageStatus.push({
            number: contact.number,
            status: "success",
            message_id: result.message_id,
          });
        }
      }
    } else {
      console.log("No emergency contacts or location:", userId);
    }

    return res.status(200).json({
      message: "SOS created successfully",
      imageUrl,
      sos,
      messageStatus,
      user: await User.findById(userId).select("-password"),
    });
  } catch (error) {
    console.error("Error in UploadImageBase64:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  } finally {
    // ---- ALWAYS RELEASE LOCK ----
    sendingSOS.delete(userId);
  }
};

/* -------------------------------------------------------------
   Get User's Images
   ------------------------------------------------------------- */
const GetUserImages = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("images");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({
      message: "Images retrieved successfully",
      images: user.images || [],
    });
  } catch (error) {
    console.error("Error in GetUserImages:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

/* -------------------------------------------------------------
   Upload Profile Picture
   ------------------------------------------------------------- */
const UploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const { image } = req.body;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let profilePictureUrl = DEFAULT_IMAGE_URL;

    if (image && image !== "") {
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid Base64 image format" });
      }

      const extension = matches[1].toLowerCase();
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const allowedTypes = ["jpeg", "jpg", "png", "gif"];
      if (!allowedTypes.includes(extension)) {
        return res.status(400).json({ error: "Only jpeg, jpg, png, gif are allowed" });
      }

      const filename = `${userId}-profile.${extension}`;
      const formData = new FormData();
      formData.append("image", buffer, {
        filename,
        contentType: `image/${extension}`,
      });

      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const uploadEndpoint = "https://tapis-one.com/upload/";
      try {
        const uploadRes = await axios.post(uploadEndpoint, formData, {
          headers: {
            ...formData.getHeaders(),
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 60000,
        });

        if (uploadRes.data.fileUrl) {
          profilePictureUrl = uploadRes.data.fileUrl;
        }
      } catch (err) {
        console.error("Profile picture upload failed:", err.response?.data || err.message);

        if (err.response?.status === 400) {
          const retryFormData = new FormData();
          retryFormData.append("file", buffer, {
            filename,
            contentType: `image/${extension}`,
          });
          try {
            const retryRes = await axios.post(uploadEndpoint, retryFormData, {
              headers: {
                ...retryFormData.getHeaders(),
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
              timeout: 60000,
            });
            if (retryRes.data.fileUrl) {
              profilePictureUrl = retryRes.data.fileUrl;
            }
          } catch (retryErr) {
            console.error("Retry upload failed:", retryErr.message);
          }
        }
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in UploadProfilePicture:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

/* -------------------------------------------------------------
   Export
   ------------------------------------------------------------- */
export { UploadImageBase64, GetUserImages, UploadProfilePicture };














// import { User } from "../../models/user.model.js";
// import { Sos } from "../../models/sos.model.js";
// import axios from "axios";
// import FormData from "form-data"; // Ensure form-data is installed

// const DEFAULT_IMAGE_URL = "https://cdn.fileshare.ing/production/morcq4c2iq.jpeg";

// const getAddressFromCoordinates = async (latitude, longitude) => {
//   const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
//   try {
//     const response = await axios.get(url);
//     return response.data.display_name || "Unknown Location";
//   } catch (error) {
//     console.error("Error fetching address:", error);
//     return "Location unavailable";
//   }
// };

// const sendWhatsAppMessage = async (phoneNumber, message, mediaUrl = null) => {
//   console.log(phoneNumber, message, mediaUrl)
//   const apiConfig = {
//     url: "https://wa.ezeelink.net/api/sendImage",
//     apiKey: "WDex@2312",
//     session: "ezeelink",
//   };

//   const formattedPhoneNumber = `${phoneNumber.trim().replace(/^\+/, "")}@c.us`;

//   const requestBody = {
//     chatId: formattedPhoneNumber,
//     file: mediaUrl
//       ? {
//           mimetype: "image/jpeg",
//           filename: "image.jpg",
//           url: mediaUrl,
//         }
//       : null,
//     reply_to: null,
//     caption: message,
//     session: apiConfig.session,
//   };

//   try {
//     const response = await axios.post(apiConfig.url, requestBody, {
//       headers: {
//         accept: "application/json",
//         "X-Api-Key": apiConfig.apiKey,
//         "Content-Type": "application/json",
//       },
//     });

//     if (response.data?.id && response.data?.fromMe === true) {
//       return { success: true, data: response.data };
//     } else {
//       console.error(`Failed to send WhatsApp message to ${formattedPhoneNumber}: Invalid response structure`);
//       return { error: "Failed to send WhatsApp message", code: "INVALID_RESPONSE" };
//     }
//   } catch (error) {
//     console.error(`Failed to send message to ${formattedPhoneNumber}:`, error.response?.data || error.message);
//     return { error: "Failed to send WhatsApp message", code: error.response?.status || "UNKNOWN_ERROR" };
//   }
// };

// const UploadImageBase64 = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { image, latitude, longitude, description } = req.body;
//     // Fetch user
//     const user = await User.findOne({ _id: userId });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     let imageUrl = DEFAULT_IMAGE_URL; // Use default image if no valid image is provided

//     // Process image only if it's not an empty string or null
//     if (image && image !== "") {
//       // Validate and process image
//       const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
//       if (!matches || matches.length !== 3) {
//         return res.status(400).json({ error: "Invalid Base64 image format" });
//       }

//       const extension = matches[1];
//       const base64Data = matches[2];
//       const buffer = Buffer.from(base64Data, "base64");

//       const allowedTypes = ["jpeg", "jpg", "png", "gif"];
//       if (!allowedTypes.includes(extension.toLowerCase())) {
//         return res.status(400).json({ error: "Only jpeg, jpg, png, gif are allowed" });
//       }

//       // Upload image to tapis-one.com
//       const formData = new FormData();
//       const filename = `photo-${userId}-${Date.now()}.${extension}`;
//       formData.append("image", buffer, {
//         filename,
//         contentType: `image/${extension.toLowerCase()}`,
//       });

//       const token = req.headers.authorization?.split(" ")[1];
//       if (!token) {
//         return res.status(401).json({ error: "No token provided" });
//       }

//       const uploadEndpoint = "https://tapis-one.com/upload/";
//       try {
//         const uploadRes = await axios.post(uploadEndpoint, formData, {
//           headers: {
//             ...formData.getHeaders(),
//             Accept: "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           timeout: 60000,
//         });

//         if (uploadRes.data.fileUrl) {
//           imageUrl = uploadRes.data.fileUrl;
//         } else {
//           console.warn("Image upload response missing fileUrl, using default URL");
//         }
//       } catch (err) {
//         console.error("Image upload failed:", err.response?.data || err.message);
//         if (err.response?.status === 400) {
//           console.warn("Server responded with 400:", err.response.data);
//           const retryFormData = new FormData();
//           retryFormData.append("file", buffer, {
//             filename,
//             contentType: `image/${extension.toLowerCase()}`,
//           });
//           try {
//             const retryRes = await axios.post(uploadEndpoint, retryFormData, {
//               headers: {
//                 ...retryFormData.getHeaders(),
//                 Accept: "application/json",
//                 Authorization: `Bearer ${token}`,
//               },
//               timeout: 60000,
//             });
//             if (retryRes.data.fileUrl) {
//               imageUrl = retryRes.data.fileUrl;
//             }
//           } catch (retryErr) {
//             console.error("Retry upload failed:", retryErr.response?.data || retryErr.message);
//           }
//         }
//       }

//       await User.findOneAndUpdate(
//         { _id: userId },
//         {
//           $push: {
//             images: {
//               url: imageUrl,
//               uploadedAt: new Date(),
//             },
//           },
//         },
//         { new: true }
//       );
//     }

//     let sos = null;
//     if (latitude && longitude) {
//       await Sos.deleteOne({ userId: req.user._id });
//       sos = new Sos({
//         latitude,
//         longitude,
//         description: description || "",
//         timestamp: new Date(),
//         userId: req.user._id,
//       });
//       await sos.save();
//     }

//     const emergencyContacts = user.emergencyContacts || [];
//     const messageStatus = [];
//     if (emergencyContacts.length > 0) {
//       const mapsLink = latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : "";
//       const address = latitude && longitude ? await getAddressFromCoordinates(latitude, longitude) : "Location not provided";
//       const message = `🚨 URGENT SOS ALERT 🚨\n\n🔹 *Name:* ${user.name}\n🔹 *Contact:* ${user.phoneNumber}\n🔹 *Location:* ${address}\n${mapsLink ? `📍 *Live Location:* ${mapsLink}\n` : ""}${description ? `✉️ *Message:* ${description}\n` : ""}\n⚠️ This person is in an emergency situation and needs immediate assistance. Please respond urgently.`;

//       for (const contact of emergencyContacts) {
//         const result = await sendWhatsAppMessage(contact.number, message, imageUrl);
//         if (result?.error) {
//           messageStatus.push({
//             number: contact.number,
//             status: "failed",
//             error: result.error,
//             code: result.code,
//           });
//         } else {
//           messageStatus.push({
//             number: contact.number,
//             status: "success",
//           });
//         }
//       }
//     } else {
//       console.log("No emergency contacts found for user");
//     }

//     return res.status(200).json({
//       message: "SOS created successfully",
//       imageUrl,
//       sos,
//       messageStatus,
//       user: await User.findById(userId),
//     });
//   } catch (error) {
//     console.error("Error in UploadImageBase64:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };

// const GetUserImages = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId).select("images");
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     return res.status(200).json({
//       message: "Images retrieved successfully",
//       images: user.images,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: error.message });
//   }
// };

// const UploadProfilePicture = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { image } = req.body;

//     const user = await User.findOne({ _id: userId });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     let profilePictureUrl = DEFAULT_IMAGE_URL; // Use default image if no valid image is provided

//     if (image && image !== "") {
//       const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
//       if (!matches || matches.length !== 3) {
//         return res.status(400).json({ error: "Invalid Base64 image format" });
//       }

//       const extension = matches[1];
//       const base64Data = matches[2];
//       const buffer = Buffer.from(base64Data, "base64");

//       const allowedTypes = ["jpeg", "jpg", "png", "gif"];
//       if (!allowedTypes.includes(extension.toLowerCase())) {
//         return res.status(400).json({ error: "Only jpeg, jpg, png, gif are allowed" });
//       }

//       const formData = new FormData();
//       const filename = `${userId}.${extension}`;
//       formData.append("image", buffer, {
//         filename,
//         contentType: `image/${extension.toLowerCase()}`,
//       });

//       const token = req.headers.authorization?.split(" ")[1];
//       if (!token) {
//         return res.status(401).json({ error: "No token provided" });
//       }

//       const uploadEndpoint = "https://tapis-one.com/upload/";
//       try {

//         const uploadRes = await axios.post(uploadEndpoint, formData, {
//           headers: {
//             ...formData.getHeaders(),
//             Accept: "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           timeout: 60000,
//         });

//         if (uploadRes.data.fileUrl) {
//           profilePictureUrl = uploadRes.data.fileUrl;
//         } else {
//           console.warn("Profile picture upload response missing fileUrl, using default URL");
//         }
//       } catch (err) {
//         console.error("Profile picture upload failed:", err.response?.data || err.message);
//         if (err.response?.status === 400) {
//           console.warn("Server responded with 400:", err.response.data);
//           const retryFormData = new FormData();
//           retryFormData.append("file", buffer, {
//             filename,
//             contentType: `image/${extension.toLowerCase()}`,
//           });
//           try {
//             const retryRes = await axios.post(uploadEndpoint, retryFormData, {
//               headers: {
//                 ...retryFormData.getHeaders(),
//                 Accept: "application/json",
//                 Authorization: `Bearer ${token}`,
//               },
//               timeout: 60000,
//             });
//             if (retryRes.data.fileUrl) {
//               profilePictureUrl = retryRes.data.fileUrl;
//             }
//           } catch (retryErr) {
//             console.error("Retry upload failed:", retryErr.response?.data || retryErr.message);
//           }
//         }
//       }
//     }

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: userId },
//       { profilePicture: profilePictureUrl },
//       { new: true }
//     );

//     return res.status(200).json({
//       message: "Profile picture uploaded successfully",
//       profilePicture: profilePictureUrl,
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error("Error in UploadProfilePicture:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };

// export { UploadImageBase64, GetUserImages, UploadProfilePicture };













