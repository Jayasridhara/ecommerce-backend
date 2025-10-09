const express = require('express');
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, getSellerProducts, getFilteredProducts, getProductReviews, addOrUpdateReview } = require('../controller/productController');
const { isAuthenticated, allowUsers } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const Product = require('../models/Product');
const User = require('../models/User');


const productRouter = express.Router();

// Public routes
productRouter.get("/", getAllProducts);
productRouter.get("/", getFilteredProducts);
productRouter.get("/:id", getProductById);
productRouter.get("/:id/reviews", getProductReviews);


productRouter.post(
  "/:id/upload-image",
  isAuthenticated,
  allowUsers(['seller']),
  upload.single("image"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // Ensure the logged-in seller owns this product
      if (product.seller.toString() !== req.userId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized: not your product" });
      }

      if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: "No image uploaded" });
      }

      // Cloudinary returns `req.file.path` as the image URL
      product.image = req.file.path;
      await product.save();
      
      res.json({
        success: true,
        message: "Product image uploaded successfully",
        product,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Seller-protected routes
productRouter.post("/:id/reviews", isAuthenticated, addOrUpdateReview);
productRouter.post("/", isAuthenticated,allowUsers(['seller']), createProduct);
productRouter.put("/:id", isAuthenticated,allowUsers(['seller']), updateProduct);
productRouter.delete("/:id", isAuthenticated,allowUsers(['seller']), deleteProduct);
productRouter.get("/seller/getproduct", isAuthenticated,allowUsers(['seller']), getSellerProducts);


module.exports=productRouter;


