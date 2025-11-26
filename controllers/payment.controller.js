import asyncHandler from 'express-async-handler';
import axios from 'axios';
import Payment from '../models/Payment.js';
import File from '../models/File.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { BASE_URL, FRONTEND_URL, PAYSTACK_SECRET_KEY } from '../config/env.js';


const createChatIfNotExists = async (buyerId, creatorId, fileId) => {
  let chat = await Chat.findOne({
    participants: { $all: [buyerId, creatorId] },

  });

  if (!chat) {
    chat = await Chat.create({
      participants: [buyerId, creatorId],
      file: fileId
    });
  }

  return chat;
};

// Initialize payment
export const initializePayment = asyncHandler(async (req, res) => {
  // const { fileId } = req.body;
  // const userId = req.user._id;

  // // Find file
  // const file = await File.findById(fileId).populate('creator');
  // if (!file) return res.status(404).json({ message: 'File not found' });

  // // Check if user already paid
  // const existingPayment = await Payment.findOne({ user: userId, file: fileId, status: 'success' });
  // if (existingPayment) return res.status(400).json({ message: 'You have already paid for this file' });

  const reference = `ref_${Date.now()}`;

  // Create pending payment record
  // await Payment.create({
  //   user: userId,
  //   file: fileId,
  //   amount: file.price,
  //   status: 'pending',
  //   transactionReference: reference
  // });

  // Callback URL for Paystack redirect
  const callback_url = `${BASE_URL}/api/v1/payment/verify/${reference}`;

  // Initialize Paystack transaction
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: 'akingbolaodun@gmail.com',
      amount: 10000 * 100, // convert to kobo
      callback_url,
      // metadata: { userId, fileId }
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  res.status(200).json({
    authorization_url: response.data.data.authorization_url,
    response: response.data,
    reference
  });
});


//Verify Transaction
export const verifyPayment = asyncHandler(async (req, res) => {
  // Get actual Paystack reference from query (not your own custom ref)
  const paystackReference = req.query.reference;

  if (!paystackReference) {
    return res.status(400).json({ message: 'Missing transaction reference' });
  }

  // Verify payment with Paystack API
  const response = await axios.get(`https://api.paystack.co/transaction/verify/${paystackReference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
  });

  const data = response.data.data;

  // Find your payment record (match your custom ref or use metadata if you stored it)
  const payment = await Payment.findOne({
    $or: [
      { transactionReference: paystackReference }, // if you stored it as Paystack reference
      { transactionReference: req.params.reference } // fallback
    ]
  })
    .populate({
      path: 'file',
      populate: { path: 'creator' }
    });

  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  if (data.status === 'success') {
    payment.status = 'success';
    payment.updatedAt = Date.now();
    const file = await File.findById(payment.file);
    if (file) {
      file.sales = (file.sales || 0) + 1;
      await file.save();
    }
    await payment.save();

    await createChatIfNotExists(
      payment.user,
      payment.file.creator,
      payment.file._id
    );

    return res.redirect(`${FRONTEND_URL}/payment-success?reference=${paystackReference}`);
  } else {
    payment.status = 'failed';
    await payment.save();
    return res.redirect(`${FRONTEND_URL}/payment-failed?reference=${paystackReference}`);
  }
});

export const handlePaystackWebhook = asyncHandler(async (req, res) => {
  // Validate webhook signature (optional but recommended)
  const signature = req.headers['x-paystack-signature'];
  // You can verify using your secret key here to ensure it’s from Paystack

  const event = req.body;

  // 2️⃣ Determine event type
  const eventType = event.event; // e.g., 'charge.success', 'charge.failed'

  const reference = event.data.reference; // matches your transactionReference or paymentGatewayReference

  const payment = await Payment.findOne({ transactionReference: reference });
  if (!payment) {
    return res.status(404).send('Payment not found');
  }

  switch (eventType) {
    case 'charge.success':
      payment.status = 'success';
      // Optional: store additional details
      payment.paidAt = new Date();
      await payment.save();
      // TODO: grant user access to the file
      break;

    case 'charge.failed':
      payment.status = 'failed';
      await payment.save();
      // TODO: notify user payment failed
      break;

    default:
      // Ignore other events
      break;
  }
  console.log('Webhook received:', req.body);
  res.sendStatus(200); // Must respond 200 to acknowledge webhook
})
