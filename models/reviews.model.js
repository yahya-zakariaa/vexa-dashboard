import mongoose from "mongoose";

const reviewsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [0, "Rating must be at least 0"],
      max: [5, "Rating must be at most 5"],
    },
    review: {
      type: String,
      required: [true, "Comment is required"],
      minLength: [10, "Comment must be at least 10 characters"],
      maxLength: [200, "Comment must be at most 200 characters"],
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewsSchema);
