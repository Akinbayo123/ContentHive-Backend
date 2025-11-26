import express from 'express';
import { register, login,forgotPassword,resetPassword, logout } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validation.js';
import { registerRules, loginRules } from '../validations/auth.js';

const authRoutes = express.Router();

authRoutes.post('/register', validateRequest(registerRules), register);
authRoutes.post('/login', validateRequest(loginRules), login);
authRoutes.post('/logout',logout)
// Request password reset
authRoutes.post('/forgot-password', forgotPassword);

// Reset password
authRoutes.put('/reset-password/:token', resetPassword);


export default authRoutes;