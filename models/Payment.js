import mongoose from 'mongoose';
import PaymentStatus from '../enums/PaymentStatus.js';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  amount: { type: Number, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
  transactionReference: { type: String, required: true },
  paymentGatewayReference: { type: String },
  idempotencyKey: {
    type: String,
    unique: true,
    index: true
  },
  authorizationUrl: String,

}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
