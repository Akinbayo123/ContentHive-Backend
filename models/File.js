// models/File.js
import mongoose from "mongoose";
import slugify from "slugify";

const fileSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String },
  slug: { type: String, unique: true },
  price: { type: Number, required: true },
  url: { type: String, required: true },
  views: { type: Number, default: 0 },
  sales: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'published' },
  cloudinary_id: { type: String },
  previewImage: { type: String },
  previewImage_id: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  isAvailable: { type: Boolean, default: true },

}, { timestamps: true });



fileSchema.pre("save", function (next) {
  if (this.isModified("title")) { // Only update slug if name changes
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("File", fileSchema);
