import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: 30,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
      required: [true, "At least one image is required"],
      validate: [(array) => array.length > 0, "At least one image is required"],
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    avgPrice: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtuals
categorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  justOne: false,
});

categorySchema.virtual("productsCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Indexing
categorySchema.index({ name: 1, isActive: 1, slug: 1 });

export const Category = mongoose.model("Category", categorySchema);
