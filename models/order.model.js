import mongoose from "mongoose";
import { Product } from "./product.model.js";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price must be non-negative"],
  },
  size: {
    type: String,
    enum: ["XS", "S", "M", "L", "XL", "XXL"],
  },
});

const shippingSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String },
  country: { type: String, default: "Egypt" },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (val) => val.length > 0,
        message: "Order must contain at least one item.",
      },
    },
    shippingAddress: shippingSchema,

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "PayPal"],
      default: "Cash",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    deliveryStatus: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price must be non-negative"],
    },

    isPaid: { type: Boolean, default: false },
    paidAt: Date,

    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("save", function (next) {
  let total = 0;
  this.items.forEach((item) => {
    total += item.price * item.quantity;
  });
  this.totalPrice = total;
  next();
});

orderSchema.post("save", async function (doc, next) {
  if (doc.paymentStatus === "Paid") {
    for (const item of doc.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { soldCount: item.quantity },
      });
    }
  }
  next();
});

export const Order = mongoose.model("Order", orderSchema);
