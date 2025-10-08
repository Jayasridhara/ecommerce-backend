const Product=require('../models/Product')
// ✅ Get all products with search, filter, pagination
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

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
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
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, price, rating, color, productType, description, image } = req.body;
    const imageurl="/mnt/uploads/"+image;
    const newProduct = new Product({
      name,
      price,
      rating,
      color,
      productType,
      description,
      image:imageurl,
      seller: req.userId, // optional
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
    const updates = req.body;

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

// ✅ Get all products posted by a seller
 const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports={
    getAllProducts,getProductById,createProduct,updateProduct,deleteProduct,getSellerProducts
}