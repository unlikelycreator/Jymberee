// src/schemas/referral.schema.js
import { z } from 'zod';

export const applyReferralSchema = z.object({
  body: z.object({
    referralCode: z
      .string()
      .min(6, 'Referral code must be at least 6 characters')
      .max(10, 'Referral code too long')
      .toUpperCase(),
  }),
});