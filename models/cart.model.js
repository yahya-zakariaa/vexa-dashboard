import mongoose from "mongoose";
import { Product } from "./product.model.js";

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, default: 1 },
      size: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL"],
      },
      color: { type: String },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
});

cartSchema.pre("save", async function (next) {
  let total = 0;

  for (let item of this.items) {
    const product = await mongoose.model("Product").findById(item.product);
    if (product) {
      total += product.totalPrice * item.quantity;
    }
  }

  this.totalPrice = total;
  next();
});

export const Cart = mongoose.model("Cart", cartSchema);
