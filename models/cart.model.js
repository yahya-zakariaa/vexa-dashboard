import mongoose from "mongoose";
import { Product } from "./product.model.js";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Product is required"],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, "Quantity must be at least 1"],
  },
  size: {
    type: String,
    enum: ["XS", "S", "M", "L", "XL", "XXL"],
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: {
    type: [cartItemSchema],
  },
});

cartSchema.pre("save", async function (next) {
  try {
    const productIds = this.items.map((item) => item.product.toString());
    const products = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), product);
    });

    let total = 0;

    for (let item of this.items) {
      const product = productMap.get(item.product.toString());
      if (product) {
        item.price = product.totalPrice;
        total += product.totalPrice * item.quantity;
      } else {
        return next(new Error("One of the products does not exist"));
      }
    }

    this.totalPrice = total;
    next();
  } catch (err) {
    next(err);
  }
});

export const Cart = mongoose.model("Cart", cartSchema);
