import express from "express";
import {
  addToCart,
  deleteCart,
  deleteProductInCart,
  getCart,
  updateProductInCart,
} from "../../controllers/store/cart.controller.js";
import { check_auth } from "../../middleware/auth.middleware.js";

const router = express.Router();
router.use(check_auth());
router
  .route("/:id")
  .post(addToCart)
  .delete(deleteProductInCart)
  .patch(updateProductInCart);
router.route("/").delete(deleteCart).get(getCart);
export default router;
