import express from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import {
  GenerateReferralCode,
  Invite,
  ApplyReferralCode,
  GetEarnings,
  GetInvitedUsers,
} from '../../controllers/v3/referral.controller.js';

const router = express.Router();

// Apply auth to all routes
router.use(authenticate);

// CORRECT: Remove leading /referral
router.post('/generate', GenerateReferralCode);
router.post('/invite', Invite);
router.post('/apply', ApplyReferralCode);
router.get('/earnings', GetEarnings);
router.get('/invited', GetInvitedUsers);

export default router;