// models/installs.model.js
import mongoose from "mongoose";

const installSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    installId: {
      type: String,
      unique: true,
      sparse: true,  // Allows null values without uniqueness violation
      index: true,   // Faster queries
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'unknown',
    },
    userAgent: {
      type: String,
      trim: true,
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    timestamps: true,
    strict: false  // Optional: allows extra fields from frontend
  }
);

export const Install = mongoose.model("Install", installSchema);