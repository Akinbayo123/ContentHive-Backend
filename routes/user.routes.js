// routes/user.routes.js
import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import * as Controller from '../controllers/user.controller.js';
import { profileUpdateRules } from '../validations/profileUpdate.js';
import { validateRequest } from '../middlewares/validation.js';


const userRoutes = express.Router();
userRoutes.use(isAuthenticated);
// Get logged-in user profile
userRoutes.get('/me', Controller.getUserProfile);

// Update profile (except email)
userRoutes.put('/me',   validateRequest(profileUpdateRules),Controller.updateUserProfile);

// View all available files (creators’ uploads)
userRoutes.get('/files', Controller.getAllFiles);

userRoutes.get('/files/categories', Controller.getAllCategories);

// Get file details by ID
userRoutes.get('/files/:slug', Controller.getFileDetails);
// Download purchased file

userRoutes.get('/files/download/:fileId', Controller.downloadPurchasedFile);
//  Purchase a file
userRoutes.post('/purchase/:fileId', Controller.purchaseFile);

userRoutes.get('/successful-purchases', Controller.getUserSuccessfulPurchases);
userRoutes.get('/all-purchases', Controller.getUserAllPurchases);

userRoutes.post('/favourites/:fileId', Controller.addToFavourites);
userRoutes.get('/favourites', Controller.getFavourites);
userRoutes.delete('/favourites/:fileId', Controller.removeFromFavourites);



// userRoutes.ts
userRoutes.get('/dashboard', Controller.getUserDashboard)


export default userRoutes;
