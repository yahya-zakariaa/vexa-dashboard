import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Name is required"],
      maxLength: [50, "Name must be at most 50 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minLength: [10, "Description must be at least 10 characters"],
      maxLength: [200, "Description must be at most 200 characters"],
      trim: true,
    },

    // Media & Visuals
    images: {
      type: [String],
      required: [true],
      validate: [(array) => array.length > 0, "At least one image is required"],
    },

    // Pricing & Sales
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be at least 0"],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      min: [0, "Discount must be at least 0"],
      max: [100, "Discount cannot exceed 100%"],
      validate: {
        validator: function (v) {
          return !(this.isOnSale && v === 0);
        },
        message: "Discount must be > 0 when product is on sale",
      },
      default: 0,
    },
    totalPrice: {
      type: Number,
      min: [0, "Total price must be at least 0"],
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },

    // Inventory & Sales
    stock: {
      type: Number,
      required: [true, "Count in stock is required"],
      min: [0, "Count in stock must be at least 0"],
      default: 1,
    },
    totalSold: {
      type: Number,
      min: [0, "Total sold must be at least 0"],
      default: 0,
    },
    availability: {
      type: Boolean,
      default: true,
    },

    // Product Attributes
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    sizes: {
      type: [String],
      required: [true, "Sizes are required"],
      enum: {
        values: ["XS", "S", "M", "L", "XL", "XXL"],
        message: "Size must be one of XS, S, M, L, XL, XXL",
      },
    },

    gender: {
      type: String,
      default: "Unisex",
      enum: {
        values: ["Men", "Women", "Unisex"],
        message: "Gender must be one of Men, Women or Unisex",
      },
    },

    // Reviews & Ratings
    ratingCount: {
      type: Number,
      min: [0, "Rating must be at least 0"],
      default: 0,
    },
    avgRating: {
      type: Number,
      min: [0, "Average rating must be at least 0"],
      max: [5, "Average rating must be at most 5"],
      default: 0,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Middleware for price calculation
productSchema.pre("save", function (next) {
  try {
    this.calculateTotalPrice();
    this.checkAvailability();
    if (this.avgRating < 0 || this.avgRating > 5) {
      throw new Error("Average rating must be between 0 and 5");
    }
    if (this.discount < 0 || this.discount > 100) {
      throw new Error("Discount must be between 0 and 100");
    }
    next();
  } catch (error) {
    next(error);
  }
});

productSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update.price !== undefined || update.discount !== undefined) {
    const price =
      update.price !== undefined
        ? update.price
        : (await this.model.findOne(this.getQuery())).price;
    const discount =
      update.discount !== undefined
        ? update.discount
        : (await this.model.findOne(this.getQuery())).discount;
    update.totalPrice = price * (1 - discount / 100);
    this.totalPrice = Number(Math.max(this.totalPrice, 0).toFixed(0));
  }

  if (update.stock !== undefined) {
    update.availability = update.stock > 0;
  }
  next();
});

// Helper methods
productSchema.methods.calculateTotalPrice = function () {
  this.totalPrice = this.price * (1 - this.discount / 100);
  this.totalPrice = Number(Math.max(this.totalPrice, 0).toFixed(0));
};

productSchema.methods.checkAvailability = function () {
  this.availability = this.stock > 0;
};

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });

export const Product = mongoose.model("Product", productSchema);
