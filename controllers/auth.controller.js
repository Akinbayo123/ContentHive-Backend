import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { EMAIL_URL, FRONTEND_URL, JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import File from '../models/File.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { tokenBlacklist } from "../utils/tokenBlacklist.js";
export const register = asyncHandler(async (req, res) => {
  const { name, email, password,role } = req.body;

  let user = await User.findOne({ email });if (user) {
  const providerMessages = {
    google: 'This email is already registered via Google. Please login with Google.',
    github: 'This email is already registered via GitHub. Please login with GitHub.'
  };

  return res.status(400).json({
    message: providerMessages[user.oauthProvider] || 'This email is already registered. Please login with your password.'
  });
}

  // const hashedPassword = await bcrypt.hash(password, 10);
  user = await User.create({ name, email,  role: role.toLowerCase(),password });
const payload = {
  id: user._id,
    role: user.role,       
    email: user.email,     
  name: user.name        
};
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  const { password: pwd, ...userWithoutPassword } = user._doc;
  res.status(201).json({ token, user: userWithoutPassword });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  // Block OAuth users
  if (user.oauthProvider === 'google' || user.oauthProvider === 'github') {
    return res.status(400).json({
      message: `This email is already registered via ${user.oauthProvider}. Please login with ${user.oauthProvider}.`
    });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
const payload = {
  id: user._id,
    role: user.role,       
    email: user.email,     
  name: user.name        
};

  // Generate JWT
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  const { password: pwd, ...userWithoutPassword } = user._doc;
  res.json({ token, user: userWithoutPassword });
});


export const logout = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(400).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];
  tokenBlacklist.push(token); // add token to blacklist

  res.json({
    message: "Logged out successfully"
  });
};


export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Please provide an email' });

  const user = await User.findOne({ email, oauthProvider: { $exists: false } });

  if (!user) return res.status(404).json({ message: 'No user found with that email' });

// Rate Limiting
  const cooldownMinutes = 1; // how many minutes they must wait

  if (user.lastForgotPasswordRequest) {
    const lastRequest = user.lastForgotPasswordRequest.getTime();
    const now = Date.now();

    if (now - lastRequest < cooldownMinutes * 60 * 1000) {
      const secondsLeft = Math.ceil(
        (cooldownMinutes * 60 * 1000 - (now - lastRequest)) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${secondsLeft} seconds before requesting another reset email.`,
      });
    }
  }
  // ==============================

  // Save new request time
  user.lastForgotPasswordRequest = Date.now();

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${EMAIL_URL}/reset-password?token=${resetToken}`;
  const message = `You requested a password reset. Click here to reset your password: \n\n ${resetUrl} \n\n If you did not request this, please ignore this email.`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: message,
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: 'Email could not be sent', error: error.message });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const resetToken = req.params.token;
  const { password } = req.body;

  if (!password) return res.status(400).json({ message: 'Please provide a new password' });
  if (!resetToken) return res.status(400).json({ message: 'Invalid or missing token' });
if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  // Hash token and compare
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({ message: 'Password reset successful' });
});
