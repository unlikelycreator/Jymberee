// src/services/email.service.js
import { createTransport } from 'nodemailer';
import { getEmailTemplate } from '../utils/emailTemplate.js';

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

export const sendOTP = async (user, type = 'register') => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // SAVE OTP TO USER
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
  await user.save();

  const html = getEmailTemplate(user.name, otp, type);
  await sendEmail(user.email, `Your Jymberee ${type === 'login' ? 'Login' : 'Verification'} OTP`, html);
  
  return otp;
};