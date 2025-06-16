import User from "../../models/user.model.js";
import { generateTokens, deleteTokens, setCookies } from "../../utils/jwt.js";

const adminLogin = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields",
    });
  }

  try {
    let admin = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!admin || admin.role !== "admin") {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    }

    const { access_token, refresh_token } = await generateTokens(
      admin._id,
      admin.role
    );
    setCookies(res, access_token, refresh_token);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        _id: admin._id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        image: admin.image,
        role: admin.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const adminLogout = async (req, res, next) => {
  try {
    const { refresh_token } = req.cookies;
    if (!refresh_token) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { id } = req.user;
    await deleteTokens(id);

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.status(200).json({ status: "success", message: "Logout successful" });
  } catch (error) {
    return next(error);
  }
};

export { adminLogin, adminLogout };
