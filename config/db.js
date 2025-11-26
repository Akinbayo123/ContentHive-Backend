import mongoose from 'mongoose';

import { DB_URI } from './env.js';

if (!DB_URI) {
    // throw new Error("Please define a valid database uri")
    console.log("Please define a valid database uri");

}
const connectDB = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
