import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import { setCookies, generateTokens } from "../utils/jwt.js";

export const check_auth = (requiredRole = null) => {
  return async (req, res, next) => {
    console.log("check auth start");

    try {
      const { access_token, refresh_token } = req.cookies;

      if (!access_token || !refresh_token) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized: Login first",
        });
      }

      let decoded;

      try {
        decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET);
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({
            status: "error",
            message: "Unauthorized: Invalid access token",
          });
        }

        // Try refreshing the token
        try {
          const refreshDecoded = jwt.verify(
            refresh_token,
            process.env.REFRESH_TOKEN_SECRET
          );

          const storedToken = await redis.get(
            `refresh_token:${refreshDecoded.userId}`
          );
          if (!storedToken || storedToken !== refresh_token) {
            return res.status(401).json({
              status: "error",
              message: "Invalid or expired refresh token",
            });
          }

          // Generate new tokens
          const newTokens = await generateTokens(
            refreshDecoded.userId,
            refreshDecoded.role
          );
          setCookies(res, newTokens.access_token, newTokens.refresh_token);
          decoded = {
            userId: refreshDecoded.userId,
            role: refreshDecoded.role,
          };
        } catch (refreshErr) {
          return res.status(401).json({
            status: "error",
            message: "Invalid or expired refresh token",
          });
        }
      }

      const user = await User.findById(decoded.userId).select("_id role");
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "User not found",
        });
      }

      req.user = { id: user._id.toString(), role: user.role };

      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({
          status: "error",
          message: "Forbidden: Insufficient permissions",
        });
      }
      next();
    } catch (err) {
      console.error("check_auth error:", err);
      res.status(500).json({
        status: "error",
        message: err.message || "Internal server error",
      });
    }

    console.log("check auth end");
  };
};
