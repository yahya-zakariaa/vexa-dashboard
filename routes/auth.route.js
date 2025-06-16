import express from "express";
import {
  signup,
  login,
  logout,
  getOTP,
  sendOTP,
  checkAuth,
} from "../controllers/store/auth.controller.js";
import {
  adminLogin,
  adminLogout,
} from "../controllers/dashboard/auth.controller.js";
import { check_auth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/dashboard/login", adminLogin);
router.post("/dashboard/logout", check_auth("admin"), adminLogout);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/:adminId", checkAuth);
router.post("/password-recovery", sendOTP);
router.post("/send-otp-code", getOTP);

export default router;
