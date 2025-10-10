const express = require('express');
const { addToWishlist, removeFromWishlist, getWishlist } = require('../controller/wishlistController');
const wishlistRouter = express.Router();
wishlistRouter.post('/add', addToWishlist);

// Remove product from wishlist
wishlistRouter.post('/remove',removeFromWishlist );

// Get user's wishlist
wishlistRouter.get('/:userId',getWishlist);

module.exports=wishlistRouter;