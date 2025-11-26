import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN,JWT_SECRET,FRONTEND_URL } from '../config/env.js';
const oauthRoutes = express.Router();

// Google OAuth
oauthRoutes.get('/google', (req, res, next) => {
  const role = req.query.role || 'user'; // default role
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role // pass role in state
  })(req, res, next);
});

oauthRoutes.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error(err);
      // Redirect to frontend error page with message
      return res.redirect(`${FRONTEND_URL}/oauth-error?message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      // If no user is returned by passport, redirect to login
      return res.redirect(`${FRONTEND_URL}/login`);
    }
const payload = {
  id: user._id,
    role: user.role,       
    email: user.email,     
  name: user.name        
};
    // Generate JWT token for the authenticated user
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/oauth-success?token=${token}&redirect=/dashboard`);
  })(req, res, next); // <-- important: immediately invoke with (req, res, next)
});


// Github OAuth
oauthRoutes.get('/github', (req, res, next) => {
  const role = req.query.role || 'user'; // default to 'user'
  passport.authenticate('github', {
    scope: ['user:email'],
    state: role // pass role as state
  })(req, res, next);
});

oauthRoutes.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      console.error(err);
      // Redirect to frontend error page with message
      return res.redirect(`${FRONTEND_URL}/oauth-error?message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      // If no user is returned by passport, redirect to login
      return res.redirect(`${FRONTEND_URL}/login`);
    }
const payload = {
  id: user._id,
    role: user.role,       
    email: user.email,     
  name: user.name        
};
    // Generate JWT token for the authenticated user
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/oauth-success?token=${token}&redirect=/dashboard`);
  })(req, res, next); // important: immediately invoke with (req, res, next)
});

oauthRoutes.get('/oauth-success', (req, res) => {
  res.send('OAuth Success! Token: ' + req.query.token);
});

export default oauthRoutes;
