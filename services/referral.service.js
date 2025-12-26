// src/services/referral.service.js
import { User } from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { logError } from '../utils/logger.js';

export const generateReferralCode = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const newCode = await User.generateUniqueReferralCode();
  user.referralCode = newCode;
  await user.save();

  return newCode;
};


export const applyReferralCode = async (userId, referralCode) => {
  console.log('applyReferralCode called:', { userId, referralCode });

  const user = await User.findById(userId);
  if (!user) {
    console.log('User not found');
    throw new AppError('User not found', 404);
  }

  if (user.referrer) {
    console.log('Referral already applied');
    throw new AppError('Referral code already applied', 400);
  }

  const inviter = await User.findOne({ referralCode });
  if (!inviter) {
    console.log('Invalid referral code');
    throw new AppError('Invalid referral code', 400);
  }

  if (inviter._id.toString() === user._id.toString()) {
    console.log('Cannot self-refer');
    throw new AppError('Cannot use your own referral code', 400);
  }

  try {
    console.log('Applying rewards...');
    inviter.balance += 10;
    inviter.referredUsers.push(user._id);
    inviter.transactions.push({
      title: 'Referral Bonus',
      amount: 10,
      type: 'credit',
      relatedUser: user._id,
    });

    user.balance += 5;
    user.referrer = inviter._id;
    user.transactions.push({
      title: 'Welcome Bonus',
      amount: 5,
      type: 'credit',
      relatedUser: inviter._id,
    });

    console.log('Saving users...');
    await Promise.all([inviter.save(), user.save()]);
    console.log('Referral applied successfully');
  } catch (err) {
    console.log('Save failed:', err.message);
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)[0]?.message || 'Invalid data';
      throw new AppError(msg, 400);
    }
    throw err;
  }

  return { message: 'Referral applied successfully' };
};

export const getEarnings = async (userId) => {
  const user = await User.findById(userId).select('balance transactions');
  if (!user) throw new AppError('User not found', 404);

  return {
    balance: user.balance,
    transactions: user.transactions,
  };
};

export const getInvitedUsers = async (userId) => {
  const user = await User.findById(userId).populate(
    'referredUsers',
    'name email phoneNumber'
  );
  if (!user) throw new AppError('User not found', 404);

  return { invitedUsers: user.referredUsers };
};

export const getInviteInfo = async (userId) => {
  const user = await User.findById(userId).select('referralCode');
  if (!user) throw new AppError('User not found', 404);

  return {
    message: 'Use your referral code to invite others.',
    referralCode: user.referralCode,
  };
};