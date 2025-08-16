import express from "express";
import { check_auth } from "./../../middleware/auth.middleware.js";
import {
  createOrder,
  getOrders,
} from "../../controllers/store/order.controller.js";
const router = express.Router();

router.use(check_auth());
router.route("/").post(createOrder).get(getOrders);

export default router;
