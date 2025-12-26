// models/advertisement.model.js
import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  redirectUrl: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);