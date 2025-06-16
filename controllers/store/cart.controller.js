import User from "../../models/user.model.js";
import { Cart } from "./../../models/cart.model.js";

const addToCart = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    let { quantity = 1, size, color } = req.body;
    const { id } = req.user;

    if (!productId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: please provide product id",
      });
    }

    quantity = Number(quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Quantity must be a positive number",
      });
    }

    let cart = await Cart.findOne({ user: id });

    if (!cart) {
      cart = await Cart.create({
        user: id,
        items: [],
      });
      let user = await User.findByIdAndUpdate(id, {
        cart: cart._id,
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, size, color });
    }

    await cart.save();
    await cart.populate("items.product");

    return res.status(200).json({
      status: "success",
      message: "Product added to cart",
      data: cart.items,
    });
  } catch (error) {
    return next(error);
  }
};
const getCart = async (req, res, next) => {
  const { id } = req.user;

  try {
    let cart = await Cart.findOne({ user: id });

    if (!cart) {
      cart = await Cart.create({
        user: id,
        items: [],
      });
      let user = await User.findByIdAndUpdate(id, {
        cart: cart._id,
      });
    }

    await cart.populate("items.product");

    return res.status(200).json({
      status: "success",
      data: cart.items || [],
    });
  } catch (error) {
    return next(error);
  }
};
const updateProductInCart = async (req, res, next) => {
  const { id: productId } = req.params;
  const { size, quantity, color } = req.body;
  const { id } = req.user;

  if (!productId) {
    return res.status(400).json({
      status: "error",
      message: "Missing product id in request",
    });
  }

  try {
    const cart = await Cart.findOne({ user: id });
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "please add product to cart frist",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: "Product not found in cart",
      });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      if (typeof size !== "undefined") cart.items[itemIndex].size = size;
      if (typeof color !== "undefined") cart.items[itemIndex].color = color;
      if (typeof quantity !== "undefined")
        cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate("items.product");

    return res.status(200).json({
      status: "success",
      message: "Cart updated successfully",
      data: cart.items,
    });
  } catch (error) {
    return next(error);
  }
};
const deleteProductInCart = async (req, res, next) => {
  const { id: productId } = req.params;
  const { id } = req.user;
  if (!productId) {
    return res.status(400).json({
      status: "error",
      message: "Missing product id in request",
    });
  }
  try {
    const cart = await Cart.findOne({ user: id });
    if (!cart)
      return res.status(404).json({
        status: "faild",
        message: "cart not found",
      });
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: "Product not found in cart",
      });
    } else {
      cart.items.splice(itemIndex, 1);
    }
    await cart.save();
    return res.status(200).json({
      status: "success",
      message: "cart deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
const deleteCart = async (req, res, next) => {
  const { id } = req.user;

  try {
    const cart = await Cart.findOne({ user: id });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Cart cleared successfully",
      data: [],
    });
  } catch (error) {
    return next(error);
  }
};

export {
  addToCart,
  getCart,
  updateProductInCart,
  deleteProductInCart,
  deleteCart,
};
