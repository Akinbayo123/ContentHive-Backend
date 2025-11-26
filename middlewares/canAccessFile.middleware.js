import Payment from '../models/Payment.js';

export const canAccessFile = async (req, res, next) => {
  const { fileId } = req.params;
  const userId = req.user._id;

  const payment = await Payment.findOne({ user: userId, file: fileId, status: 'success' });
  if (!payment) return res.status(403).json({ message: 'You must pay to access this file' });

  next();
};
