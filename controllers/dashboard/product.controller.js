import { Product } from "../../models/product.model.js";
import { uploadToCloudinary } from "../../utils/cloudinary.js";

const createProduct = async (req, res, next) => {
  const {
    name,
    description,
    price,
    category,
    stock,
    sizes,
    gender,
    discount,
    discountType,
    availability,
    collection,
  } = req.body;
  const uploadedImages = [];

  try {
    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
      return res.status(409).json({
        status: "fail",
        message: "Product with this name or description is exist",
      });
    }

    for (const file of req.files) {
      const url = await uploadToCloudinary(file.buffer);
      uploadedImages.push(url);
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "At least one image is required",
      });
    }
    const validatedDiscount = Math.min(Math.max(discount || 0, 0), 100);

    const product = await Product.create({
      name: name?.trim(),
      description: description,
      price: parseInt(price)?.toFixed(0),
      category,
      images: uploadedImages,
      stock: parseInt(stock),
      discount: validatedDiscount,
      gender,
      sizes,
      discountType,
      availability: !!availability,
      collection,
    });
    if (!product)
      return res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    await product.save();
    console.log("product:", product);

    return res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};
const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate("category")
      .sort({ avgRating: -1 });

    if (!products) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      data: products,
      total: products?.length,
    });
  } catch (error) {
    return next(error);
  }
};
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate("category");

    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      name,
      description,
      price,
      category,
      stock,
      sizes,
      gender,
      discount,
      discountType,
      availability,
    } = req.body;
    console.log(req.body);

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing product ID in URL",
      });
    }

    try {
      if (typeof sizes === "string" && sizes !== undefined)
        sizes = JSON.parse(sizes);
      if (typeof images === "string" && images !== undefined)
        images = JSON.parse(images);
    } catch (err) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid JSON in sizes or images",
      });
    }
    if (req.body.images) {
      if (!Array.isArray(req.body.images)) {
        return res.status(400).json({
          status: "faild",
          message: "images must be an array",
        });
      }
    } else if (req.files) {
      if (!Array.isArray(req.files)) {
        return res.status(400).json({
          status: "faild",
          message: "images must be an array",
        });
      }
    }

    if (typeof req.body.images === "string") {
      req.body.images = JSON.parse(req.body.images);
    }

    const oldImageUrls = Array.isArray(req.body.images) ? req.body.images : [];

    const uploadedImages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        uploadedImages.push(url);
      }
    }

    const finalImages = [...oldImageUrls, ...uploadedImages];

    const updateData = {};

    if (typeof name === "string") updateData.name = name.trim();
    if (typeof description === "string")
      updateData.description = description.trim();
    if (!isNaN(price)) updateData.price = Number(parseFloat(price).toFixed(0));
    if (typeof category === "string") updateData.category = category;
    if (!isNaN(stock)) updateData.stock = parseInt(stock);
    if (Array.isArray(sizes)) updateData.sizes = sizes;
    if (typeof gender === "string") updateData.gender = gender;
    if (discount) {
      const validatedDiscount = Math.min(Math.max(discount || 0, 0), 100);
      updateData.discount = validatedDiscount;
    }
    if (discountType) updateData.discountType = discountType;
    if (availability !== undefined) {
      updateData.availability =
        availability === "true" || availability === true;
    }

    if (finalImages.length > 0) {
      updateData.images = finalImages;
    }

    if (Object.keys(updateData).length < 1)
      return res.status(400).json({
        status: "fail",
        message: "No changes to update",
      });
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }
    await updatedProduct.save();
    console.log("product updated");

    return res.status(200).json({
      status: "success",
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "Product ID is required",
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProducts = async (req, res, next) => {};

export {
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProducts,
  getProducts,
  getProduct,
};
