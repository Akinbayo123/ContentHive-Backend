import express from 'express';
import { handlePaystackWebhook, verifyPayment } from '../controllers/payment.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const paystackRoutes = express.Router();

paystackRoutes.post('/webhook/paystack', handlePaystackWebhook);
paystackRoutes.get('/verify/:reference', verifyPayment);


export default paystackRoutes;