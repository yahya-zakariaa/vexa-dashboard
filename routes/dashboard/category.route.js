import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../../controllers/dashboard/category.controller.js";
import { check_auth } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";

const router = express.Router();

router.use(check_auth("admin"));

router
  .route("/")
  .get(getCategories)
  .post(upload.array("files", 3), createCategory);

router.route("/:id").delete(deleteCategory).put(updateCategory);

export default router;
