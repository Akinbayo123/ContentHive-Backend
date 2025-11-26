import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: { type: String },
}, { timestamps: true });

// Pre-save hook to generate slug from name
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) { // Only update slug if name changes
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("Category", categorySchema);
