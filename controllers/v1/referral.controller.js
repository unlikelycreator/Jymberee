// src/controllers/v1/referral.controller.js
import asyncHandler from '../../middlewares/asyncHandler.js';
import validate from '../../middlewares/validate.js';
import {
  generateReferralCode,
  applyReferralCode,
  getEarnings,
  getInvitedUsers,
  getInviteInfo,
} from '../../services/referral.service.js';
import { applyReferralSchema } from '../../schemas/referral.schema.js';

export const GenerateReferralCode = asyncHandler(async (req, res) => {
  const code = await generateReferralCode(req.user._id);
  res.json({ message: 'Referral code generated', referralCode: code });
});

export const ApplyReferralCode = [
  validate(applyReferralSchema),
  asyncHandler(async (req, res) => {
    const result = await applyReferralCode(req.user._id, req.body.referralCode);
    res.json(result);
  }),
];

export const GetEarnings = asyncHandler(async (req, res) => {
  const data = await getEarnings(req.user._id);
  res.json(data);
});

export const GetInvitedUsers = asyncHandler(async (req, res) => {
  const data = await getInvitedUsers(req.user._id);
  res.json(data);
});

export const Invite = asyncHandler(async (req, res) => {
  const data = await getInviteInfo(req.user._id);
  res.json(data);
});