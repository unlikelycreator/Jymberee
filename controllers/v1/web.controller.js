// controllers/web.controller.js
import { User } from "../../models/user.model.js";
import { Install } from "../../models/installs.model.js";

// GET all users (for dashboard)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -otp") // Never send password
      .lean();

    return res.status(200).json({
      total: users.length,
      users,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// GET single user by ID (for referrer name in modal)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ error: error.message });
  }
};
// controllers/web.controller.js
export const trackInstall = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    const { installId, platform } = req.body;

    // Use installId as primary key (more reliable than IP)
    const queryKey = installId ? { installId } : { ip };

    await Install.findOneAndUpdate(
      queryKey,  // ← Use installId if available
      {
        ip,
        installId,
        platform: platform || 'unknown',
        userAgent: req.headers["user-agent"] || 'Unknown',
        installedAt: new Date(),
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true  // Use defaults for new docs
      }
    );

    return res.status(201).json({ 
      success: true, 
      message: "Install tracked successfully" 
    });
  } catch (error) {
    console.error('trackInstall error:', error);
    return res.status(500).json({ error: error.message });
  }
};
// Get install stats
export const getInstallStats = async (req, res) => {
  try {
    const installs = await Install.find({}).sort({ installedAt: -1 }).lean();
    return res.status(200).json({
      total: installs.length,
      installs,
    });
  } catch (error) {
    console.error("getInstallStats error:", error);
    return res.status(500).json({ error: error.message });
  }
};