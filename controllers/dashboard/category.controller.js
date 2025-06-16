import { Category } from "../../models/category.model.js";

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      status: "success",
      data: categories,
      total: categories?.length,
    });
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  const { name, image, isActive, slug } = req.body;
  const { id } = req.user;
  if (!name || !slug || !image) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields",
    });
  }
  try {
    const category = await Category.create({
      name,
      image,
      isActive: isActive !== "undefined" ? isActive : true,
      slug,
      createdBy: id,
    });
    res.status(201).json({
      status: "success",
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  const { name, image, isActive, slug, isFutered } = req.body;
  const { id } = req.params;
  let updateData = {};
  if (name) updateData.name = name;
  if (image) updateData.image = image;
  if (slug) updateData.slug = slug;
  if (typeof isActive !== "undefined") updateData.isActive = isActive;
  if (typeof isFutered !== "undefined") updateData.isFutered = isFutered;
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "No fields provided to update",
    });
  }
  try {
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedCategory) {
      return res.status(404).json({
        status: "error",
        message: "Category not found or invalid ID",
      });
    }
    res.status(201).json({
      status: "success",
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields",
    });
  }
  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({
        status: "error",
        message: "Category not found or invalid ID",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export { createCategory, updateCategory, deleteCategory, getCategories };
