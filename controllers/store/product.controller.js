import { Product } from "../../models/product.model.js";
import Review from "../../models/reviews.model.js";

const getProducts = async (req, res, next) => {
  const { limit = 10, page = 1, category, q } = req.query;

  const skip = (page - 1) * limit;

  const query = {
    stock: { $gte: 0 },
  };

  if (q) {
    query.name = { $regex: q, $options: "i" };
  }

  if (category) {
    query.category = category;
  }

  try {
    const products = await Product.find(query)
      .sort({ avgRating: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (!products) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }
    const productsWithTotalPrice = products.map((product) => ({
      ...product.toObject(),
      totalPrice: Number(
        (product.price * (1 - product.discount / 100)).toFixed(0)
      ),
    }));
    return res.status(200).json({
      status: "success",
      data: productsWithTotalPrice,
      total: products?.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getProduct = async (req, res, next) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: product || [],
    });
  } catch (error) {
    return next(error);
  }
};

const addReview = async (req, res, next) => {
  const { id } = req.params;
  const { review, rating } = req.body;
  const { _id } = req.user;
  try {
    const review = await Review.create({
      product: id,
      user: _id,
      review,
      rating,
    });
    await review.save();
    const product = await Product.findByIdAndUpdate(id, {
      $push: { reviews: review._id },
      $inc: { countRating: 1 },
    });
    await product.save();
    res.status(201).json({
      status: "success",
      message: "Review added successfully",
      data: review,
    });
  } catch (error) {
    return next(error);
  }
};
const getSearchSuggestions = async (req, res, next) => {
  const { q } = req.query;

  try {
    const query = {
      avgRating: { $gte: 0 },
      stock: { $gte: 1 },
    };

    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    const products = await Product.find(query)
      .sort({ avgRating: -1 })
      .limit(5)
      .select("name _id avgRating images");

    res.status(200).json({
      status: "success",
      data: products,
      total: products.length,
    });
  } catch (error) {
    return next(error);
  }
};

export { getProducts, getProduct, addReview, getSearchSuggestions };
