
const mongoose = require('mongoose'); // Assuming this is imported elsewhere
const User = require('../models/User');
const Product = require('../models/Product');

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body; // <--- CORRECTED: Get userId from body
    // console.log("Received add to wishlist:", { userId, productId }); // For debugging

    if (!userId || !productId) {
      return res.status(400).json({ message: 'userId and productId are required' });
    }

    // Optional: ensure product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } }, // <--- CORRECTED: Use $addToSet for uniqueness
      { new: true } // Return the updated document
    ).populate('wishlist'); // Populate to send back full product details

    // <--- CORRECTED: Check if user was found before accessing properties
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the updated user's wishlist (ensure it's an array)
    return res.status(200).json(updatedUser.wishlist || []);
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  const { userId, productId } = req.body;
  // console.log("Received remove from wishlist:", { userId, productId }); // For debugging

  try {
    if (!userId || !productId) {
      return res.status(400).json({ message: 'userId and productId are required' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } }, // Use $pull to remove product ID from array
      { new: true } // Return the updated document
    ).populate('wishlist'); // Populate to send back full product details

    

    // <--- CORRECTED: Check if user was found
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the updated user's wishlist (ensure it's an array)
    res.status(200).json(updatedUser.wishlist || []);
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  const { userId } = req.params;
  // console.log("Received get wishlist for:", userId); // For debugging

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId is required in params' });
    }

    const user = await User.findById(userId).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return the user's wishlist (ensure it's an array)
    res.status(200).json(user.wishlist || []);
  } catch (error) {
    console.error("Error getting wishlist:", error);
    res.status(500).json({ message: 'Server error' });
  }
};