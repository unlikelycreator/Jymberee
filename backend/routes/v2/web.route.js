// routes/admin.route.js
import express from "express";
import {
  getAllUsers,
  trackInstall,
  getInstallStats,
  getUserById, // ← Now imported from controller
} from "../../controllers/v2/web.controller.js";

const router = express.Router();

/* ----- USER DASHBOARD (no auth) ----- */
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById); // ← Moved here from inline

/* ----- INSTALL TRACKER (no auth) ----- */
router.post("/install", trackInstall);
router.get("/installs", getInstallStats);

export default router;