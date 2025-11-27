import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import User from '../models/User.js';
import { BASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './env.js';

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/api/v1/oauth/google/callback`,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const role = req.query.state || 'user'; // role from frontend
    const email = profile.emails[0].value;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.oauthProvider) {
        return done(new Error('This email is already registered with email/password. Please login using your email and password.'), null);
      }
      // User exists → login
      if (user.oauthProvider && user.oauthProvider !== 'google') {
        return done(new Error(`This email is already registered with ${user.oauthProvider}. Please login using that method.`), null);
      }
      return done(null, user); // login existing Google user
    }

    // User does not exist → register
    user = await User.create({
      name: profile.displayName,
      email,
      oauthProvider: 'google',
      role: role.toLowerCase()
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));



passport.use(new GithubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/api/v1/oauth/github/callback`,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const role = req.query.state || 'user';

    let user = await User.findOne({ email });

    if (user) {
      if (!user.oauthProvider) {
        return done(new Error('This email is already registered with email/password. Please login using your email and password.'), null);
      }
      // User exists → login
      if (user.oauthProvider && user.oauthProvider !== 'github') {
        return done(new Error(`This email is already registered with ${user.oauthProvider}. Please login using that method.`), null);
      }
      return done(null, user); // login existing GitHub user
    }

    // User does not exist → register
    user = await User.create({
      name: profile.displayName,
      email,
      oauthProvider: 'github',
      role: role.toLowerCase()
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));



