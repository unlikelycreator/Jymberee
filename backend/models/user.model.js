// src/models/user.model.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { indianRegions } from "../utils/indianStates.js";

// ──────────────────────────────────────────────────────────────
// Sub-schemas
// ──────────────────────────────────────────────────────────────

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Contact name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
  },
  number: {
    type: String,
    required: [true, "Contact number is required"],
    trim: true,
  },
  countryCode: {
    type: String,
    trim: true,
    default: null,
  },
});

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
    maxlength: [200, "Street address cannot exceed 200 characters"],
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, "City name cannot exceed 50 characters"],
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, "State name cannot exceed 50 characters"],
  },
  postalCode: {
    type: String,
    trim: true,
    required: false,
  },
  country: {
    type: String,
    trim: true,
    required: false,
    maxlength: [50, "Country name cannot exceed 50 characters"],
  },

});

const notificationSubSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    default: "",
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sos",
    },
  ],
  latitude: {
    type: Number,
    required: false,
  },
  longitude: {
    type: Number,
    required: false,
  },
  mark_as_read: {
    type: Number,
    enum: [0, 1],
    default: 0, // 0 = unseen, 1 = seen
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const transactionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// ──────────────────────────────────────────────────────────────
// Main User Schema
// ──────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    countryCode: {
      type: String,
      required: [true, "Country code is required"],
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      required: false,
    },
    fcmToken: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || typeof v === "string",
        message: "FCM token must be a string or null",
      },
    },
    profilePicture: {
      type: String,
      default: "",
    },

    // ←←← COMPLETELY OPTIONAL & DEFAULTS TO EMPTY ARRAY ←←←
    preferredLocations: {
      type: [{
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
      }],
      default: [],
    },


    emergencyContacts: {
      type: [emergencyContactSchema],
      required: [true, "At least one emergency contact is required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one emergency contact is required",
      },
    },

    images: [
      {
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    notifications: {
      type: [notificationSubSchema],
      default: [],
    },

    otp: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referredUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },

    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────────────────────────
// Deleted User Archive Schema
// ──────────────────────────────────────────────────────────────

const deletedUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: String,
    email: String,
    phoneNumber: String,
    profilePicture: String,
    referralCode: String,
    referrer: mongoose.Schema.Types.ObjectId,
    referredUsers: [mongoose.Schema.Types.ObjectId],
    balance: Number,
    transactions: [mongoose.Schema.Types.Mixed],
    preferredLocations: [mongoose.Schema.Types.Mixed],
    emergencyContacts: [mongoose.Schema.Types.Mixed],
    images: [mongoose.Schema.Types.Mixed],
    notifications: [mongoose.Schema.Types.Mixed],
    reason: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────────────────────────
// Methods & Statics
// ──────────────────────────────────────────────────────────────

// Generate JWT Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      phoneNumber: this.phoneNumber,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d" }
  );
};

// Generate unique 6-digit alphanumeric referral code
userSchema.statics.generateUniqueReferralCode = async function () {
  let code;
  let existingUser;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    existingUser = await this.findOne({ referralCode: code });
  } while (existingUser);
  return code;
};

// ──────────────────────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────────────────────

userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

// ──────────────────────────────────────────────────────────────
// Models
// ──────────────────────────────────────────────────────────────

export const User = mongoose.model("User", userSchema);
export const DeletedUser = mongoose.model("DeletedUser", deletedUserSchema);