import express from "express";
const router = express.Router();
import {
  getProducts,
  getProduct,
  getSearchSuggestions,
} from "../../controllers/store/product.controller.js";
import { check_auth } from "../../middleware/auth.middleware.js";
import { errorHandler } from "../../middleware/error_handler.middleware.js";

// Main Product Routes
router.route("/").get(getProducts);
router.route("/search-suggestions").get(getSearchSuggestions);
router.route("/:id").get(getProduct);

router.use(errorHandler);
export default router;
