import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/store/product.route.js";
import cartRoutes from "./routes/store/cart.route.js";
import categoryRoutes from "./routes/store/category.route.js";
import admin_productRoutes from "./routes/dashboard/product.route.js";
import admin_categoryRoutes from "./routes/dashboard/category.route.js";
import userRoutes from "./routes/user.route.js";
import cookieParser from "cookie-parser";
import { EventEmitter } from "events";
import bodyParser from "body-parser";

import cors from "cors";
EventEmitter.defaultMaxListeners = 20;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://vexa-dashboard.vercel.app"],
    credentials: true,
  })
);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard/products", admin_productRoutes);
app.use("/api/dashboard/categories", admin_categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("global error:", err.message);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
  connectDB();
});
