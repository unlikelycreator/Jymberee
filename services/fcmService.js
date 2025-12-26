import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

admin.initializeApp({
  credential: admin.credential.cert(
    path.join(__dirname, "../serviceAccountKey.json")
  ),
});

const token = "eaUeaNa-SwO15HwDNEedzr:APA91bGegu8ayQoWi46WEazNYcZ5N1hNdouabOrZyk5JFCCLdI4nnbMVANkDwr_sW5OXep38kLBi8oP72-lI2tMVAPFRbdEzGLGG-C9UWqQx-pLC92JutIY";

const message = {
  token,
  notification: {
    title: "TEST ALERT 🚨",
    body: "This is a manual test from backend - Working 100%!",
  },
  android: {
    priority: "high",
    notification: {
      channel_id: "sos_channel",    // make sure this matches your Android app
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

admin
  .messaging()
  .send(message)
  .then((response) => {
    console.log("✅ Notification sent successfully!");
    console.log("Message ID:", response);
    process.exit(0);
  })
  .catch((error) => {
    console.log("❌ Failed:", error.message);
    process.exit(1);
  });