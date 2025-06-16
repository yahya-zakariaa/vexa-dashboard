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

export { getCategories };
