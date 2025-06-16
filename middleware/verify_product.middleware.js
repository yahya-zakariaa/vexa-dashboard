import { validationResult } from "express-validator";
import { Category } from "../models/category.model.js";

export const verify_product = async (req, res, next) => {
  console.log(" start verify_product");

  if (!req.body) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields" });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ status: "Failed", message: errors.array() || "Invalid input" });
  }

  try {
    let {
      name,
      description,
      price,
      category,
      stock,
      gender,
      availability,
      sizes,
      discount,
      discountType,
    } = req.body;
   if (discountType && !discount) {
  return res.status(400).json({
    status: "fail",
    message: "Can't add discount type without discount amount",
  });
}

if (discount && !discountType) {
  return res.status(400).json({
    status: "fail",
    message: "Can't add discount amount without discount type",
  });
}


    price = Number(price);
    stock = Number(stock);

    availability =
      availability === "true"
        ? true
        : availability === "false"
        ? false
        : availability;

    if (!["Men", "Women", "Unisex"].includes(gender)) {
      return res
        .status(400)
        .json({ message: "Gender must be one of: Male, Women, Unisex" });
    }

    if (!category || typeof category !== "string") {
      return res.status(400).json({ message: "Invalid category" });
    }

    let categoryDoc = await Category.findOne({ name: category }).select("_id");
    if (!categoryDoc) {
      const newCategory = await Category.create({ name: category });
      await newCategory.save();
      category = newCategory._id.toString();
    } else {
      category = categoryDoc._id.toString();
    }

    const validations = [
      { value: name, type: "string", message: "Name must be a string" },
      {
        value: description,
        type: "string",
        message: "Description must be a string",
      },
      {
        value: price,
        type: "number",
        min: 1,
        message: "Price must be a positive number",
      },
      {
        value: stock,
        type: "number",
        min: 0,
        message: "Stock must be a positive number",
      },
      {
        value: availability,
        type: "boolean",
        message: "Availability must be a boolean",
      },
    ];

    for (const { value, type, min, message } of validations) {
      if (typeof value !== type) {
        console.log(message);

        return res.status(400).json({ message });
      }
      if (min !== undefined && value < min) {
        return res.status(400).json({ message });
      }
    }

    sizes = JSON.parse(sizes);
    const allowedSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const sizesKeys = Object.keys(sizes);
    const allValidSizes = sizesKeys.every((key) => allowedSizes.includes(key));
    const allBoolean = Object.values(sizes).every(
      (v) => typeof v === "boolean"
    );

    if (!allValidSizes || !allBoolean) {
      return res.status(400).json({
        message:
          "Sizes must only contain XS, S, M, L, XL, XXL with boolean values",
      });
    }

    const selectedSizes = Object.entries(sizes)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (selectedSizes.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one size must be selected" });
    }

    req.body.sizes = selectedSizes;

    req.body.category = category;
    console.log(" end verify_product");

    next();
  } catch (error) {
    next(error);
  }
};
