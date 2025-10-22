const mongoose = require("mongoose");
const Product=require('../models/Product')
// ✅ Get all products with search, filter, pagination
const normalizeString = (str) => {
  if (!str) return "";
  str = str.trim().toLowerCase();
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};


const getAllProducts = async (req, res) => {
  try {
    const { page, limit , search, color, productType, minPrice, maxPrice } = req.query;

    const query = { isActive: true };

    // Search filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (color) query.color = { $regex: color, $options: "i" };
    if (productType) query.productType = { $regex: productType, $options: "i" };

      if (minPrice != null || maxPrice != null) {
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        if (!isNaN(min) || !isNaN(max)) {
          query.price = {};
          if (!isNaN(min)) query.price.$gte = min;
          if (!isNaN(max)) query.price.$lte = max;
        }
      }


    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id;",id)
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Create a new product
const createProduct = async (req, res) =>  {
  try {
    let { name, price, rating, color, productType, productTypeOther, description, image, stock, salesCount } = req.body;
    
    name = name?.trim();
    color = color?.trim();
    productType = productType?.trim();
    productTypeOther = productTypeOther?.trim();
    description = description?.trim();
    image = image?.trim();

    // Handle "Other" product type
    if (productType === "Other" && productTypeOther) {
      productType = productTypeOther;
    }

    console.log("user",req.user._id)

    // Normalize productType and color
    name=normalizeString(name);
    productType = normalizeString(productType);
    color = normalizeString(color);

    const newProduct = new Product({
      name,
      price,
      rating,
      color,
      productType,
      description,
      image,
      seller: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
      stock: stock != null ? stock : 0,
      salesCount: salesCount != null ? salesCount : 0,
      // optional
    });

    const savedProduct = await newProduct.save();
    res.status(201).json({ message: "Product created successfully", product: savedProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // Handle "Other" product type
    if (updates.productType === "Other" && updates.productTypeOther) {
      updates.productType = updates.productTypeOther;
    }
    // Normalize productType and color if present
    if (updates.name) updates.name = normalizeString(updates.name);
    if (updates.description) updates.description = updates.description.trim();
    if (updates.productType) updates.productType = normalizeString(updates.productType);
    if (updates.color) updates.color = normalizeString(updates.color);

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete product
 const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFilteredAllProducts = async (req, res) => {
  try {
    const { type, color, minPrice, maxPrice, query } = req.query;
    const filter = {};

    if (type) filter.productType = new RegExp(`^${type}$`, "i");
    if (color) filter.color = new RegExp(`^${color}$`, "i");
    if (query) filter.name = new RegExp(query, "i");

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter);
    res.status(200).json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error filtering products" });
  }
};



const { Types } = require("mongoose");
const getFilteredProducts = async (req, res) => {
 try {
    const { type, color, minPrice, maxPrice ,outOfStock} = req.query;
      const filter = { isActive: true };

    // Add seller
    filter["seller.id"] = new Types.ObjectId(req.user.userId);

    // Add query filters
    if (req.query.type) filter.productType = req.query.type;
    if (req.query.color) filter.color = req.query.color;
    if (req.query.minPrice)
      filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
    if (req.query.maxPrice)
      filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };

   
   console.log("Filter query:", filter); // 👀 DEBUG: see what Mongo is searching

    const products = await Product.find(filter);

    console.log("Filtered products found:", products.length,products);

    res.status(200).json(products);
  } catch (error) {
    console.error("Filter error:", error);
    res.status(500).json({ message: "Error filtering products" });
  }
};



// ✅ Get all products posted by a seller
const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ "seller.id": req.user._id }).sort({ createdAt: -1 });
    // console.log("products",products)
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate("reviews.user", "name email");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ reviews: product.reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};  

const addOrUpdateReview = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if user already reviewed
    const existingReview = product.reviews.find((r) =>
      r.user.toString() === userId.toString()
    );
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = Date.now();
    } else {
      product.reviews.push({
        user: userId,
        rating,
        comment,
        createdAt: Date.now(),
      });
    }

    // Recalculate average rating
    const total = product.reviews.reduce((acc, r) => acc + r.rating, 0);
    product.rating = total / product.reviews.length;

    await product.save();

    res.status(200).json({ message: "Review added/updated", product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports={
    getAllProducts,getProductById,createProduct,updateProduct,deleteProduct,getSellerProducts,getProductReviews,addOrUpdateReview,getFilteredProducts,getFilteredAllProducts
}

