// src/schemas/auth.schema.js
import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{10,15}$/;

const locationShape = z.object({
  country: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  _id: z.string().optional(),
});

// ──────────────────────────────────────────────────────────────
// REGISTER SCHEMA
// ──────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phoneNumber: z.string().regex(phoneRegex, 'Invalid phone number (10-15 digits)'),
    countryCode: z.string().min(1, 'Country code required (e.g., +91)'),
    postalCode: z.string().optional(),

    // ←←← COMPLETELY OPTIONAL (including empty array or undefined) ←←←
    preferredLocations: z.array(locationShape).optional().default([]),

    emergencyContacts: z
      .array(
        z.object({
          name: z.string().min(1, 'Contact name required'),
          number: z.string().regex(phoneRegex, 'Invalid contact number (10-15 digits)'),
          countryCode: z.string().min(1, 'Country code required (e.g., +91)').optional(),
        })
      )
      .min(1, 'At least one emergency contact required'),

    referralCode: z.string().optional(),
  }),
});

// ──────────────────────────────────────────────────────────────
// UPDATE PROFILE SCHEMA
// ──────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Valid E.164 phone required'),
    email: z.string().email(),
    postalCode: z.string().optional(),

    // ←←← ALSO OPTIONAL HERE (can be omitted, null, or empty array) ←←←
    preferredLocations: z.array(locationShape).optional().default([]),
  }),
});

// ──────────────────────────────────────────────────────────────
// OTHER SCHEMAS (unchanged except minor cleanup)
// ──────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid international phone number, e.g. +60123456789'),
    password: z.string().min(6),
  }),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});


export const resendOTPSchema = z.object({ body: z.object({ email: z.string().email() }) });
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email().optional(),
    phoneNumber: z.string().optional()
  })
}).refine(
  (data) => data.body.email || data.body.phoneNumber,
  {
    message: "Either email or phoneNumber is required",
    path: ["body"]
  }
);

export const resetPasswordSchema = z.object({ body: z.object({ password: z.string().min(6) }) });
export const fcmTokenSchema = z.object({ body: z.object({ fcmToken: z.string().nullable() }) });
export const profilePictureSchema = z.object({ body: z.object({ imageUrl: z.string().url() }) });
export const emergencyContactSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    number: z.string().regex(phoneRegex),
  }),
});
export const deleteAccountSchema = z.object({ body: z.object({ reason: z.string().min(1) }) });

export const deleteByEmailSchema = z.object({ body: z.object({ email: z.string().email() }) });
