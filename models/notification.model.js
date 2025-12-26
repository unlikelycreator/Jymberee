// First, create a new model file: models/notification.model.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // For faster queries per user
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: false,
    trim: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sos: [{
    // Assuming sos is an array of objects; adjust based on your Sos model structure
    type: mongoose.Schema.Types.Mixed // Or define a sub-schema if needed
  }],
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const NotificationModel = mongoose.model("Notification", notificationSchema);