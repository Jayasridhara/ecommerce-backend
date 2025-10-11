<!-- const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directory exists
const uploadPath = path.join(__dirname, '../mnt/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + Date.now() + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = allowed.test(file.mimetype);
  const extname = allowed.test(ext);
  if (mimetype && extname) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload; -->



const Product = require("../models/Product");
const User = require("../models/User");
const mongoose=require('mongoose');
// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.body.productId; // expect single id string

    if (!productId) return res.status(400).json({ message: 'productId is required' });
    
    // optional: ensure product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updated = await User.findByIdAndUpdate(
      userId,
      { $push: { wishlist: productId } }, // adds once, preserves existing items
      { new: true }
    ).populate('wishlist');

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  const { userId, productId } = req.body;

  try {
    // Remove product from user's wishlist
    const user = await User.findById(userId);
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  const { userId } = req.params;

  try {
    // Populate wishlist with product details
    const user = await User.findById(userId).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};