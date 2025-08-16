import express from "express";
import {
  signup,
  login,
  logout,
  checkAuth,
} from "../controllers/store/auth.controller.js";
import {
  adminLogin,
  adminLogout,
} from "../controllers/dashboard/auth.controller.js";
import { check_auth } from "../middleware/auth.middleware.js";
import {
  sendOTP,
  verifyOTP,
  updatePassword,
} from "../controllers/store/otp.controller.js";

const router = express.Router();
router.post("/dashboard/login", adminLogin);
router.post("/dashboard/logout", check_auth("admin"), adminLogout);
router.get("/:adminId", checkAuth);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/recovery/send-otp", sendOTP);
router.post("/recovery/verify-otp", verifyOTP);
router.post("/recovery/reset-password", updatePassword);
export default router;
