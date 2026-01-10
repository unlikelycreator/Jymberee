// src/services/auth.service.js
import bcrypt from 'bcryptjs';
import { User, DeletedUser } from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { sendOTP, sendEmail } from './email.service.js';
import { getEmailTemplate } from '../utils/emailTemplate.js';
import { logError } from '../utils/logger.js';

// Normalize phone: accepts "9876543210" + "+91" → "+919876543210"
const normalizePhone = (num, code) => {
  const cleanNum = num.replace(/[^0-9+]/g, '');
  const cleanCode = code.replace(/[^0-9+]/g, '');
  if (cleanNum.startsWith(cleanCode)) return cleanNum;
  const codeNoPlus = cleanCode.replace(/^\+/, '');
  const numNoPlus = cleanNum.replace(/^\+/, '');
  return `+${codeNoPlus}${numNoPlus}`;
};

const isValidE164 = (phone) => {
  console.log('Validating E.164:', phone);
  const match = phone.match(/^\+(\d{1,15})$/);
  if (!match) return false;
  const digits = match[1];
  const valid = digits.length >= 10 && digits.length <= 15 && digits[0] !== '0';
  console.log('E.164 result:', { digits, length: digits.length, valid });
  return valid;
};

export const registerUser = async (data) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    countryCode,
    postalCode,
    preferredLocations, // ← now truly optional
    emergencyContacts,
    referralCode: provided,
  } = data;

  const fullPhone = normalizePhone(phoneNumber, countryCode);
  console.log('Normalized phone:', fullPhone);

  if (!isValidE164(fullPhone)) {
    logError('PHONE_INVALID', { input: phoneNumber, code: countryCode, result: fullPhone });
    throw new AppError('Invalid phone format.', 400);
  }

  const emailLower = email?.toLowerCase().trim();

  // Check duplicate BEFORE create
  const exists = await User.findOne({
    $or: [{ email: emailLower }, { phoneNumber: fullPhone }],
  });

  if (exists) {
    logError('DUPLICATE_USER', { email: emailLower, phone: fullPhone });
    throw new AppError('User already exists', 400);
  }

  const hash = await bcrypt.hash(password, 10);
  const ownCode = await User.generateUniqueReferralCode();

  // Normalize emergency contacts — use per-contact countryCode if provided, else fallback
  const normalizedContacts = emergencyContacts.map((c) => {
    const contactCountryCode = c.countryCode || countryCode;
    const full = normalizePhone(c.number, contactCountryCode);
    if (!isValidE164(full)) {
      throw new AppError(`Invalid emergency contact: ${c.number}`, 400);
    }
    return {
      name: c.name.trim(),
      number: full,
      countryCode: contactCountryCode // optional: store if you want
    };
  });

  // CREATE WITH TRY-CATCH
  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hash,
      phoneNumber: fullPhone,
      countryCode,
      postalCode: postalCode || undefined,
      preferredLocations: preferredLocations || [], // ← safely default to empty array
      emergencyContacts: normalizedContacts,
      referralCode: ownCode,
      status: 'pending',
    });
    console.log('User created:', user._id);
  } catch (createErr) {
    logError('USER_CREATE_FAILED', {
      input: data,
      phone: fullPhone,
      error: createErr.message,
      code: createErr.code,
      keyValue: createErr.keyValue,
    });
    if (createErr.code === 11000) {
      throw new AppError('Phone or email already in use', 400);
    }
    throw new AppError(`Registration failed: ${createErr.message}`, 400);
  }

  // Referral logic
  if (provided && provided.trim()) {
    const inviter = await User.findOne({ referralCode: provided.trim() });
    if (inviter && inviter._id.toString() !== user._id.toString()) {
      inviter.balance += 10;
      inviter.referredUsers.push(user._id);
      inviter.transactions.push({
        title: 'Referral Bonus',
        amount: 10,
        type: 'credit',
        relatedUser: user._id,
      });
      await inviter.save();

      user.balance += 5;
      user.referrer = inviter._id;
      user.transactions.push({
        title: 'Welcome Bonus',
        amount: 5,
        type: 'credit',
        relatedUser: inviter._id,
      });
      await user.save();
    }
  }

  try {
    await sendOTP(user, 'register');
  } catch (err) {
    logError('OTP_EMAIL_FAILED', { userId: user._id, error: err.message });
  }

  return user;
};

// --- Other functions (verifyOTP, login, etc.) remain unchanged ---
export const verifyOTP = async ({ email, phoneNumber, otp }) => {
  if (!email && !phoneNumber) {
    throw new AppError('Email or phone number is required', 400);
  }

  const query = {
    $or: [
      email ? { email: email.toLowerCase() } : null,
      phoneNumber ? { phoneNumber } : null,
    ].filter(Boolean),
  };

  const user = await User.findOne(query);
  if (!user) throw new AppError('User not found', 404);

  if (user.status === 'active') {
    throw new AppError('Already verified', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  user.status = 'active';
  user.otp = undefined;

  await user.save();

  return {
    user,
    token: user.generateAccessToken(),
  };
};


export const loginUser = async ({ phoneNumber, password }) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) throw new AppError('User not found', 404);

  if (user.status !== 'active') {
    await sendOTP(user, 'login');
    throw new AppError('OTP sent to email for verification', 403);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError('Invalid credentials', 401);

  return { user, token: user.generateAccessToken() };
};

export const forgotPassword = async ({ phoneNumber, email }) => {
  const query = {};
  if (email) query.email = email.toLowerCase();
  if (phoneNumber) query.phoneNumber = phoneNumber;

  // If neither provided, bail out
  if (Object.keys(query).length === 0) {
    throw new AppError('Either email or phone number is required', 400);
  }

  // Try finding user by either field
  const user = await User.findOne(query);
  if (!user) throw new AppError('User not found', 404);

  // Generate temp password
  const temp = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(temp, 10);

  // Update password
  await User.updateOne({ _id: user._id }, { password: hash });

  // Notify via email (only if email exists)
  if (user.email) {
    const html = getEmailTemplate(user.name, temp, 'forgotPassword');
    await sendEmail(user.email, 'Your Jymberee Temporary Password', html);
  }
  return true;
};


export const deleteAccount = async (userId, reason) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const html = getEmailTemplate(user.name, null, 'deleteAccount');

  try {
    await sendEmail(user.email, 'Account Deletion Confirmation', html);
  } catch (e) {
    console.error('Email failed during account deletion:', e);
    logError('DELETE_ACCOUNT_EMAIL_FAILED', {
      userId,
      email: user.email,
      error: e.message,
      stack: e.stack,
    });
    // Don't throw — deletion should still proceed
  }

  // Save to DeletedUser archive
  await new DeletedUser({
    ...user.toObject(),
    userId: user._id,
    reason,
    deletedAt: new Date()
  }).save();

  // Delete from main collection
  await User.findByIdAndDelete(userId);

  // Clean up referrals
  if (user.referrer) {
    await User.findByIdAndUpdate(user.referrer, {
      $pull: { referredUsers: user._id }
    });
  }

  await User.updateMany(
    { referredUsers: user._id },
    { $pull: { referredUsers: user._id } }
  );
};