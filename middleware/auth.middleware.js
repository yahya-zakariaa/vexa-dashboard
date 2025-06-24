import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import { setCookies, generateTokens } from "../utils/jwt.js";

export const check_auth = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const { access_token, refresh_token } = req.cookies;

      // 1. Check if any token exists
      if (!access_token && !refresh_token) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized: Please login first",
        });
      }

      let userData = null;

      // 2. Verify access token if present
      if (access_token) {
        try {
          const decoded = jwt.verify(
            access_token,
            process.env.ACCESS_TOKEN_SECRET
          );
          userData = { userId: decoded.userId, role: decoded.role };
        } catch (accessError) {
          if (accessError.name !== "TokenExpiredError") {
            return res.status(401).json({
              status: "error",
              message: "Invalid access token",
            });
          }
          // Access token expired - will try refresh token below
        }
      }

      // 3. Handle refresh token if access token is missing or expired
      if ((!userData && refresh_token) || (access_token && !userData)) {
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
              message: "Invalid or expired session",
            });
          }

          // Generate new tokens and set cookies
          const newTokens = await generateTokens(
            refreshDecoded.userId,
            refreshDecoded.role
          );
          setCookies(res, newTokens.access_token, newTokens.refresh_token);

          userData = {
            userId: refreshDecoded.userId,
            role: refreshDecoded.role,
          };
        } catch (refreshError) {
          return res.status(401).json({
            status: "error",
            message: "Invalid or expired session",
          });
        }
      }

      // 4. Final verification if we still don't have user data
      if (!userData) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized: Invalid credentials",
        });
      }

      // 5. Verify user existence in database
      const user = await User.findById(userData.userId).select("_id role");
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "User account not found",
        });
      }

      // 6. Prepare request user object
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      // 7. Check role permissions
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({
          status: "error",
          message: "Forbidden: Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal authentication error",
      });
    }
  };
};
