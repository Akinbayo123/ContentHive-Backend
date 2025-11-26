// routes/admin.routes.js
import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/admin.middleware.js';
import * as controller from '../controllers/admin.controller.js';


const adminRoutes = express.Router();

// Apply authentication + admin check globally
adminRoutes.use(isAuthenticated, adminOnly);

// Users
adminRoutes.get('/users', controller.getUsers);
adminRoutes.delete('/users/:userId', controller.deleteUser);
adminRoutes.delete('/delete-users', controller.deleteAllUsers)
adminRoutes.delete('/delete-files', controller.deleteAllFiles)

// Add category
adminRoutes.post("/categories", controller.createCategory);

// Get all categories
adminRoutes.get("/categories", controller.getAllCategories);

// Files
adminRoutes.get('/files', controller.getAllFiles);
adminRoutes.delete('/files/:fileId', controller.deleteFile);
// Payments
adminRoutes.get('/payments', controller.getAllPayments);
adminRoutes.delete('/delete-payments', controller.deleteAllPayments)
adminRoutes.delete('/delete-chats', controller.deleteAllChats)
export default adminRoutes;
