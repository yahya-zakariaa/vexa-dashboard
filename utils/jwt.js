import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";

export const generateTokens = async (userId, role) => {
  try {
    const user = await User.findById(userId);
    const access_token = jwt.sign(
      { userId, role },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "6h",
      }
    );
    const refresh_token = jwt.sign(
      { userId, role },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
    await redis.set(
      `refresh_token:${userId}`,
      refresh_token,
      "EX",
      7 * 24 * 60 * 60
    );
    await redis.set(
      `access_token:${userId}`,
      access_token,
      "EX",
      1 * 24 * 60 * 60
    );
    return { access_token, refresh_token };
  } catch (error) {
    console.log("error in create or store token:", error);
  }
};

export const deleteTokens = async (userId) => {
  await redis.del(`admin_token:${userId}`);
  await redis.del(`refresh_token:${userId}`);
};

export const setCookies = (res, access_token, refresh_token) => {

  res.cookie("access_token", access_token, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 3,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};
