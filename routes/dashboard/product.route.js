import express from "express";

import {
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProducts,
  getProducts,
  getProduct,
} from "../../controllers/dashboard/product.controller.js";
import { verify_product } from "../../middleware/verify_product.middleware.js";
import { check_auth } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";

const router = express.Router();

router.use(check_auth("admin"));

// Main Product Routes
router
  .route("/")
  .post(upload.array("files", 5), verify_product, createProduct)
  .get(getProducts)
  .delete(deleteProducts);

router
  .route("/:id")
  .get(getProduct)
  .patch(upload.array("files", 5), updateProduct)
  .delete(deleteProduct);

export default router;
