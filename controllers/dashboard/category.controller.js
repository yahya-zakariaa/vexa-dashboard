import slugify from "slugify";
import { Category } from "../../models/category.model.js";
import { uploadToCloudinary } from "../../utils/cloudinary.js"; // Ensure this is implemented

const createCategory = async (req, res, next) => {
  try {
    const { name, isActive } = req.body;
    const files = req.files || [];

    // Validation
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Category name is required",
      });
    }

    if (files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "At least one image is required",
      });
    }

    // Check for existing category
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(409).json({
        status: "fail",
        message: "Category with this name already exists",
      });
    }

    // Upload images
    const imageUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer))
    );

    // Create new category
    const newCategory = await Category.create({
      name,
      images: imageUrls,
      slug: slugify(name, { lower: true }),
      isActive: isActive === "true" || isActive === true,
    });

    return res.status(201).json({
      status: "success",
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const files = req.files || [];

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Category ID is required",
      });
    }

    const updateData = {};

    // Name update
    if (name) {
      // Check for name conflict
      const existingCategory = await Category.findOne({
        name,
        _id: { $ne: id },
      });
      if (existingCategory) {
        return res.status(409).json({
          status: "fail",
          message: "Another category with this name already exists",
        });
      }

      updateData.name = name;
      updateData.slug = slugify(name, { lower: true });
    }

    // Image update
    if (files.length > 0) {
      const imageUrls = await Promise.all(
        files.map((file) => uploadToCloudinary(file.buffer))
      );
      updateData.images = imageUrls;
    }

    // Status update
    if (typeof isActive !== "undefined") {
      updateData.isActive = isActive === "true" || isActive === true;
    }

    // Validate updates
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid fields provided for update",
      });
    }

    // Perform update
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({
        status: "error",
        message: "Category not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Category ID is required",
      });
    }

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({
        status: "error",
        message: "Category not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate("productsCount");
    res.status(200).json({
      status: "success",
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    next(error);
  }
};

export { createCategory, updateCategory, deleteCategory, getCategories };
