import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  process.exit(1);
}

export const firebaseAdmin = admin;

// import admin from "firebase-admin";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { dirname } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

// // Read the file and parse it into a JavaScript object
// const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// try {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
//   console.log("Firebase Admin initialized successfully");
// } catch (error) {
//   console.error("Firebase initialization error:", error);
//   process.exit(1);
// }

// export const firebaseAdmin = admin;
