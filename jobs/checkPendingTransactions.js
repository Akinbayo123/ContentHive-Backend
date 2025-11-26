import cron from 'node-cron';
import axios from 'axios';
import Payment from '../models/Payment.js'; // your transaction model
import { PAYSTACK_SECRET_KEY } from '../config/env.js';

export const startTransactionPolling = () => {
    // run every 20 minutes
    cron.schedule('*/20 * * * *', async () => {
        console.log('Checking pending transactions...');

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const pendingTxs = await Payment.find({
            status: 'pending',
            createdAt: { $lte: tenMinutesAgo }
        });
        console.log(`Found ${pendingTxs.length} pending transactions to verify.`);

        for (const tx of pendingTxs) {
            try {
                const response = await axios.get(`https://api.paystack.co/transaction/verify/${tx.paymentGatewayReference}`, {
                    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
                });

                const result = response.data.data;

                if (result.status === 'success') {
                    tx.status = 'success';
                } else if (result.status === 'failed' || result.status === 'abandoned') {
                    tx.status = 'failed';
                }

                await tx.save();
            } catch (error) {
                console.error(`Failed to verify transaction ${tx.paymentGatewayReference}:`, error.message);
            }
        }
    });
};
