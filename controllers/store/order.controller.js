import mongoose from "mongoose";
import { Cart } from "../../models/cart.model.js";
import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import User from "../../models/user.model.js";
const validateCartItems = (cartItems) => {
  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
  const allowedSizes = ["XS", "S", "M", "L", "XL", "XXL"];

  if (!Array.isArray(cartItems)) {
    throw new Error("Cart items must be an array");
  }

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  for (let item of cartItems) {
    if (
      !item?.product ||
      !isValidObjectId(item.product) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      typeof item.price !== "number" ||
      item.price < 0 ||
      (item.size && !allowedSizes.includes(item.size))
    ) {
      throw new Error(`Invalid cart item: ${JSON.stringify(item)}`);
    }
  }
};

const validateOrderData = (shippingAddress, paymentMethod) => {
  const allowedMethods = ["Cash", "Card", "PayPal"];

  if (
    !shippingAddress ||
    !shippingAddress.fullName?.trim() ||
    !shippingAddress.phone?.trim() ||
    !shippingAddress.address?.trim() ||
    !shippingAddress.city?.trim()
  ) {
    throw new Error("All shipping address fields are required");
  }

  // Validate phone number format
  const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
  if (!phoneRegex.test(shippingAddress.phone)) {
    throw new Error("Invalid phone number format");
  }

  if (!allowedMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }
};

const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shippingAddress, paymentMethod } = req.body;
    const { userId } = req.user;

    // 1. Validate input data
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid User ID. try login again");
    }
    const userDoc = await User.findById(userId).select("cart").session(session);

    if (!userDoc || !mongoose.Types.ObjectId.isValid(userDoc.cart)) {
      throw new Error("Invalid cart. Try login again.");
    }

    const cart = await Cart.findById(userDoc.cart)
      .populate("items.product", "stock")
      .session(session);

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found. try again later",
      });
    }

    // 3. Verify cart ownership
    if (cart.user.toString() !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access to cart",
      });
    }

    // 4. Validate cart items and order data
    validateCartItems(cart.items);
    validateOrderData(shippingAddress, paymentMethod);

    // 4.1 Additional validation: stock availability
    for (const { product, quantity } of cart.items) {
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for product: ${product._id}`);
      }
    }

    // 5. Create order
    const order = await Order.create(
      [
        {
          user: userId,
          items: cart.items.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
          })),
          shippingAddress,
          paymentMethod,
          totalPrice: cart.totalPrice,
        },
      ],
      { session }
    );

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: order[0]._id } },
      { session }
    );

    // 6. Update product stock and clear cart
    const bulkOperations = cart.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: {
          $inc: {
            stock: -item.quantity,
            totalSold: item.quantity,
          },
        },
      },
    }));

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save({ session });

    // 7. Commit transaction
    await session.commitTransaction();

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order[0],
    });
  } catch (error) {
    // 8. Abort transaction on error
    await session.abortTransaction();

    // Handle specific errors
    if (error.message.includes("Insufficient stock")) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }

    next(error);
  } finally {
    session.endSession();
  }
};

const getOrders = async (req, res, next) => {
  const { userId } = req.user;

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid User ID. Try login again");
    }

    const user = await User.findById(userId)
      .select("orders")
      .populate({
        path: "orders",
        populate: {
          path: "items.product",
          model: "Product",
          select: "name price images", 
        },
      });

    if (!user || !user.orders) {
      return res.status(404).json({
        status: "error",
        message: "No orders found for this user",
      });
    }

    return res.status(200).json({
      status: "success",
      data: user.orders,
    });
  } catch (error) {
    next(error);
  }
};

export { createOrder ,getOrders};
