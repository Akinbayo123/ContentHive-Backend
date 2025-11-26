// routes/creator.routes.js
import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { creatorOnly } from '../middlewares/role.middleware.js';
import parser from '../middlewares/multer.middleware.js';
import { validateRequest } from '../middlewares/validation.js';
import { fileUploadRules } from '../validations/file-upload.js';
import { validateFiles } from '../validations/fileValidator.js';
import * as controller from '../controllers/creator.controller.js';

// Creator Routes
const creatorRoutes = express.Router();


// Use auth and role middleware for all creator routes
creatorRoutes.use(isAuthenticated);
creatorRoutes.use(creatorOnly);

const multipleUpload = parser.fields([
  { name: 'file', maxCount: 1 },
  { name: 'previewImage', maxCount: 1 }
]);
//Middlewares
creatorRoutes.use(isAuthenticated);
creatorRoutes.use(creatorOnly);

creatorRoutes.post(
  '/files',
  multipleUpload,
  validateFiles,
  validateRequest(fileUploadRules),
  controller.uploadFile
);

creatorRoutes.put('/files/:fileId', multipleUpload, validateRequest(fileUploadRules), controller.updateFile);

creatorRoutes.get('/files', controller.getMyFiles);
creatorRoutes.get('/files/:slug', controller.getFile);
creatorRoutes.patch('/files/:fileId/availability', controller.changeFileAvailability);

creatorRoutes.delete('/files/:fileId', controller.deleteFile);
creatorRoutes.get('/categories', controller.getAllCategories);
creatorRoutes.get("/dashboard", controller.getCreatorDashboard);
creatorRoutes.get('/payments', controller.getMyPayments);

export default creatorRoutes;
