import asyncHandler from '../../middlewares/asyncHandler.js';
import validate from '../../middlewares/validate.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';
import {
  registerUser, verifyOTP, loginUser, forgotPassword, deleteAccount
} from '../../services/auth.service.js';
import {
  registerSchema, verifyOTPSchema, loginSchema, forgotPasswordSchema,
  resetPasswordSchema, fcmTokenSchema, profilePictureSchema,
  updateProfileSchema, emergencyContactSchema, deleteAccountSchema,
  resendOTPSchema,
  deleteByEmailSchema
} from '../../schemas/auth.schema.js';
import { User } from '../../models/user.model.js';
import bcrypt from 'bcryptjs/dist/bcrypt.js';
import { sendOTP, sendEmail } from '../../services/email.service.js';
export const Register = [authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({ message: 'OTP sent', user: user });
})];

export const VerifyOTP = [
  validate(verifyOTPSchema),
  asyncHandler(async (req, res) => {
    const { user, token } = await verifyOTP(req.body);
    res.json({
      message: 'Verified successfully',
      user: user,
      token
    });
  })
];

export const Login = [authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { user, token } = await loginUser(req.body);
  res.json({ user, token });
})];

export const ResendOTP = [authLimiter, validate(resendOTPSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || user.status === 'active') throw new AppError('Invalid request', 400);
  await sendOTP(user, 'register');
  res.json({ message: 'OTP resent' });
})];

export const ForgotPassword = [validate(forgotPasswordSchema), asyncHandler(forgotPassword)];

export const ResetPassword = [validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  await User.findByIdAndUpdate(req.user._id, { password: hash });
  res.json({ message: 'Password updated' });
})];

export const SaveToken = [validate(fcmTokenSchema), asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { fcmToken, fcmTimestamp: new Date().toISOString().split('T')[0] }, { new: true });
  res.json({ message: 'Token saved', fcmToken: user.fcmToken });
})];

export const GetFcmToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('fcmToken fcmTimestamp');
  res.json({ fcmToken: user.fcmToken || null, fcmTimestamp: user.fcmTimestamp || null });
});

export const UploadProfilePicture = [validate(profilePictureSchema), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { profilePicture: req.body.imageUrl }, { new: true });
  res.json({ message: 'Picture updated', imageUrl: user.profilePicture });
})];

export const UpdateProfile = [validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
  res.json({ message: 'Profile updated', user });
})];

export const AddEmergencyContacts = [validate(emergencyContactSchema), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $push: { emergencyContacts: req.body } }, { new: true });
  res.json({ message: 'Contact added', emergencyContacts: user.emergencyContacts });
})];

export const DeleteEmergencyContacts = [asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { emergencyContacts: { _id: req.params.id } } }, { new: true });
  res.json({ message: 'Contact deleted', emergencyContacts: user.emergencyContacts });
})];

export const DeleteAccount = [validate(deleteAccountSchema), asyncHandler(async (req, res) => {
  await deleteAccount(req.user._id, req.body.reason);
  res.json({ message: 'Account deleted' });
})];

export const DeleteAccountByEmailId = [validate(deleteByEmailSchema), asyncHandler(async (req, res) => {
  const user = await User.findOneAndDelete({ email: req.body.email.toLowerCase() });
  if (!user) throw new AppError('User not found', 404);
  res.json({ message: 'Account deleted' });
})];