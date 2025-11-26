import mongoose from "mongoose";
const favouriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
}, { timestamps: true });

export default mongoose.model("Favourite", favouriteSchema);