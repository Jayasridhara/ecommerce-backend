const Product=require('../models/Product')
// ✅ Get all products with search, filter, pagination
const normalizeString = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, color, productType, minPrice, maxPrice } = req.query;

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
    
    // Handle "Other" product type
    if (productType === "Other" && productTypeOther) {
      productType = productTypeOther;
    }

    console.log("user",req.user._id)

    // Normalize productType and color
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

const getFilteredProducts = async (req, res) => {
  try {
    const { type, color, minPrice, maxPrice, rating, category, seller, isActive } =
      req.query;

    const filter = {};  

    if (type) filter.productType = type;
    if (color) filter.color = color;
    if (category) filter.category = category;
    if (seller) filter.seller = seller;
    if (isActive != null) filter.isActive = isActive === "true";

    if (minPrice != null || maxPrice != null) {
      filter.price = {};
      if (minPrice != null) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice != null) filter.price.$lte = parseFloat(maxPrice);
    }

    if (rating != null) {
      // products with rating ≥ given rating
      filter.rating = { $gte: parseFloat(rating) };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all products posted by a seller
const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ "seller.id": req.user._id }).sort({ createdAt: -1 });
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
    getAllProducts,getProductById,createProduct,updateProduct,deleteProduct,getSellerProducts,getProductReviews,addOrUpdateReview,getFilteredProducts
}

