// src/routes/v3/auth.routes.js
import express from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import {
  Register,
  Login,
  SaveToken,
  UploadProfilePicture,
  UpdateProfile,
  DeleteEmergencyContacts,
  AddEmergencyContacts,
  ForgotPassword,
  ResetPassword,
  GetFcmToken,
  VerifyOTP,
  ResendOTP,
  DeleteAccount,
  DeleteAccountByEmailId,
} from '../../controllers/v3/auth.controller.js';

const router = express.Router();

// ====================================
// PUBLIC ROUTES (No Auth Required)
// ====================================
router.post('/register', Register);
router.post('/verify-otp', VerifyOTP);
router.post('/resend-otp', ResendOTP);
router.post('/login', Login);
router.post('/forgot-password', ForgotPassword);

// FCM Token routes — PUBLIC (no auth needed)

router.get('/get-fcm', GetFcmToken);
router.delete('/cancel-account', DeleteAccountByEmailId);

// ====================================
// PROTECTED ROUTES (Auth Required)
// ====================================
router.use(authenticate); 

router.post('/reset-password', ResetPassword);
router.post('/save-token', SaveToken);
router.post('/profile-picture', UploadProfilePicture);
router.put('/update-profile', UpdateProfile);
router.put('/emergency-contacts', AddEmergencyContacts);
router.delete('/emergency-contacts/:id', DeleteEmergencyContacts);
router.delete('/delete-account', DeleteAccount);


export default router;