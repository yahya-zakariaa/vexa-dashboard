import User from "../../models/user.model.js";
import { generateTokens, setCookies, deleteTokens } from "../../utils/jwt.js";

const signup = async (req, res, next) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password || !phone)
    return res.status(400).json("Missing required fields");
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res.status(400).json("Invalid email");
  }
  if (!/^[0-9]{11}$/.test(phone)) {
    return res.status(400).json("Invalid phone number");
  }
  try {
    let user = await User.create({
      name,
      email,
      password,
      phone,
      address: address || [],
    });
    user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      cart: [],
      wishlist: [],
      orders: [],
      role: user.role,
    };
    const { refresh_token, access_token } = await generateTokens(
      user._id,
      user.role
    );
    if (!user) return res.status(500).json("Server side error try again");
    setCookies(res, access_token, refresh_token);
    req.user = {
      userId: user._id,
      role: user.role,
    };
    console.log(req.user);

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: user,
      access_token,
      refresh_token,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password)
    return res.status(400).json({
      status: "error",
      message: "Missing required fields",
    });
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user)
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    if (user.role === "admin")
      return res.status(403).json({
        error: "error",
        message: "Forbidden: Insufficient permissions",
      });
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });

    const { refresh_token, access_token } = await generateTokens(
      user._id,
      user.role
    );
    setCookies(res, access_token, refresh_token);
    user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      cart: user.cart,
      wishlist: user.wishlist,
      orders: user.orders,
      role: user.role,
    };
    req.user = {
      userId: user._id,
    };
    return res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      data: user,
      access_token,
      refresh_token,
    });
  } catch (error) {
    return next(error);
  }
};

const logout = (req, res, next) => {
  try {
    if (req.user) {
      deleteTokens(req.user.id);
    }
    res.clearCookie("access_token", {
      httpOnly: process.env.NODE_ENV === "production",
      secure: true,
      sameSite: "strict",
      path: "/",
    });
    res.clearCookie("refresh_token", {
      httpOnly: process.env.NODE_ENV === "production",
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    return next(error);
  }
};

const checkAuth = (req, res) => {
  res.status(200).json({ status: "success", message: "Authenticated" });
};
const sendOTP = (req, res) => {
  res.json("send otp");
};

const getOTP = (req, res) => {
  res.json("get otp");
};

export { signup, login, logout, sendOTP, getOTP, checkAuth };
