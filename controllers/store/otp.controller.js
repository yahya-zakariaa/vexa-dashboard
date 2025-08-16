import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import Redis from "ioredis";
import User from "./../../models/user.model.js";

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      reconnectOnError: (err) => {
        console.error("Redis connection error:", err.message);
        return true;
      },
    })
  : null;

const otpStorage = {
  set: async (email, data) => {
    try {
      if (redisClient) {
        await redisClient.set(
          `otp:${email}`,
          JSON.stringify(data),
          "EX",
          OTP_CONFIG.EXPIRATION_MIN * 60
        );
      } else {
        otpStore.set(email, data);
      }
    } catch (error) {
      console.error("OTP storage error:", error);
      throw new Error("Failed to store OTP");
    }
  },

  get: async (email) => {
    try {
      if (redisClient) {
        const data = await redisClient.get(`otp:${email}`);
        return data ? JSON.parse(data) : null;
      }
      return otpStore.get(email);
    } catch (error) {
      console.error("OTP retrieval error:", error);
      return null;
    }
  },

  delete: async (email) => {
    try {
      if (redisClient) {
        await redisClient.del(`otp:${email}`);
      } else {
        otpStore.delete(email);
      }
    } catch (error) {
      console.error("OTP deletion error:", error);
    }
  },

  incrementAttempts: async (email) => {
    try {
      const stored = await otpStorage.get(email);
      if (!stored) return null;

      const updated = {
        ...stored,
        attempts: stored.attempts + 1,
      };

      await otpStorage.set(email, updated);
      return updated;
    } catch (error) {
      console.error("Failed to increment attempts:", error);
      return null;
    }
  },
};

const otpStore = new Map();

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body.email || req.ip,
  skip: (req) => !req.body.email,
  handler: (req, res) => {
    res.status(429).json({
      status: "failed",
      message: "Too many OTP requests. Please try again later.",
    });
  },
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

const OTP_CONFIG = {
  EXPIRATION_MIN: 5,
  LENGTH: 4,
  COOLDOWN_SEC: 60,
  MAX_ATTEMPTS: 3,
};

const generateOTP = () => {
  const buffer = crypto.randomBytes(OTP_CONFIG.LENGTH);
  const digits = [];
  for (let i = 0; i < OTP_CONFIG.LENGTH; i++) {
    digits.push(buffer[i] % 10);
  }
  return digits.join("");
};

export const sendOTP = [
  otpRateLimiter,
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "failed",
        message: errors.array()[0].msg,
      });
    }
    const { email } = req.body;

    try {
      const stored = await otpStorage.get(email);

      if (stored?.lastSent) {
        const elapsed = Date.now() - stored.lastSent;
        if (elapsed < OTP_CONFIG.COOLDOWN_SEC * 1000) {
          const remaining = Math.ceil(
            (OTP_CONFIG.COOLDOWN_SEC * 1000 - elapsed) / 1000
          );
          return res.status(429).json({
            status: "failed",
            message: `Please wait ${remaining} seconds before requesting a new OTP`,
            remaining,
          });
        }
      }

      const isExistingAccount = await User.findOne({ email, role: "user" });
      if (!isExistingAccount)
        return res.status(404).json({
          status: "failed",
          message: "No account is associated with this email",
        });
      const otp = generateOTP();
      const expireAt = Date.now() + OTP_CONFIG.EXPIRATION_MIN * 60 * 1000;

      await otpStorage.set(email, {
        otp,
        expireAt,
        attempts: 0,
        lastSent: Date.now(),
        verified: false,
      });

      await transporter.sendMail({
        from: `Secure App <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Verification Code</h2>
            <p style="font-size: 16px;">Use this code to verify your identity:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #777;">
              This code will expire in ${OTP_CONFIG.EXPIRATION_MIN} minutes.
              If you didn't request this, please ignore this email.
            </p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              For security reasons, please do not share this code with anyone.
            </p>
          </div>
        `,
      });

      return res.status(200).json({
        status: "success",
        message: "OTP sent to your email",
      });
    } catch (error) {
      console.error("OTP sending error:", error);
      try {
        await otpStorage.delete(email);
      } catch (deleteError) {
        console.error("Failed to delete OTP:", deleteError);
      }
      next(error);
    }
  },
];

export const verifyOTP = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("invalid email format"),
  body("code")
    .notEmpty()
    .withMessage("OTP code is required")
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
  async (req, res, next) => {
    const { email, code } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "failed",
        message: errors.array()[0].msg,
      });
    }
    try {
      let stored = await otpStorage.get(email);

      if (!stored) {
        return res.status(400).json({
          status: "failed",
          message: "OTP not found or expired",
        });
      }

      if (stored.expireAt < Date.now()) {
        await otpStorage.delete(email);
        return res.status(400).json({
          status: "failed",
          message: "OTP has expired",
        });
      }

      stored = await otpStorage.incrementAttempts(email);
      if (!stored) {
        return res.status(500).json({
          status: "error",
          message: "Failed to process verification",
        });
      }

      if (stored.attempts > OTP_CONFIG.MAX_ATTEMPTS) {
        await otpStorage.delete(email);
        return res.status(429).json({
          status: "failed",
          message: "Too many attempts. OTP invalidated",
        });
      }

      if (stored.otp !== code) {
        return res.status(400).json({
          status: "failed",
          message: "Invalid OTP code",
        });
      }

      await otpStorage.set(email, {
        ...stored,
        verified: true,
      });

      return res.status(200).json({
        status: "success",
        message: "OTP verified successfully",
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      next(error);
    }
  },
];

export const updatePassword = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be between 6 and 20 characters"),
  async (req, res, next) => {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "failed",
        message: errors.array()[0].msg,
      });
    }

    try {
      const stored = await otpStorage.get(email);
      if (stored?.verified !== true) {
        return res.status(403).json({
          status: "Unauthorization",
          message: "OTP not verified for this email",
        });
      }

      const updatedUser = await User.findOneAndUpdate(
        { email },
        { password },
        { new: true }
      );

      await otpStorage.delete(email);

      if (!updatedUser) {
        return res.status(404).json({
          status: "failed",
          message: "User not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Update password error:", error);
      next(error);
    }
  },
];

if (!redisClient) {
  setInterval(() => {
    try {
      const now = Date.now();
      for (const [email, data] of otpStore.entries()) {
        if (data.expireAt < now) {
          otpStore.delete(email);
        }
      }
    } catch (error) {
      console.error("OTP cleanup error:", error);
    }
  }, 10 * 60 * 1000);
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit();
});
