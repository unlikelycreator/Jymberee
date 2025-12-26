import mongoose from "mongoose";

const sosSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }, 
  description: {
    type: String,
    required: true,
  },
});

export const Sos = mongoose.model("Sos", sosSchema);
