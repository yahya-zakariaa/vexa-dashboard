import express from "express";
import { check_auth } from "../middleware/auth.middleware.js";
import { getUserData } from "../controllers/user.controller.js";
const router = express.Router();
router.get("/me", check_auth(), getUserData);
export default router;
