import { Product } from "../../models/product.model.js";

const getProducts = async (req, res, next) => {
  const {
    limit = 12,
    page = 1,
    collection,
    search,
    sort = "newest",
    minPrice,
    maxPrice,
    gender,
    sizes,
    onSale,
  } = req.query;
  const skip = (page - 1) * limit;
  console.log(limit);

  const query = {
    stock: { $gte: 0 },
  };
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  if (gender) query.gender = gender;
  if (onSale) query.onSale = onSale === "true";
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (collection) {
    query.collection = collection;
  }
  if (sizes) {
    query.sizes = { $in: Array.isArray(sizes) ? sizes : [sizes] };
  }
  let sortOption = {};
  if (sort === "newest") sortOption = { createdAt: -1 };
  else if (sort === "oldest") sortOption = { createdAt: 1 };
  else if (sort === "price_asc") sortOption = { price: 1 };
  else if (sort === "price_desc") sortOption = { price: -1 };
  try {
    console.log(query, sortOption);

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));
    console.log(products.length);

    if (!products.length) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }
    const total = await Product.countDocuments(query);

    return res.status(200).json({
      status: "success",
      data: products,
      total,
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

export { getProducts, getProduct, getSearchSuggestions };
