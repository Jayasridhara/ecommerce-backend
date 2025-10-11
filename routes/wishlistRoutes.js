const express = require('express');
const { addToWishlist, removeFromWishlist, getWishlist } = require('../controller/wishlistController');
const { isAuthenticated } = require('../middlewares/auth');
const wishlistRouter = express.Router();
wishlistRouter.post('/add',isAuthenticated,addToWishlist);

// Remove product from wishlist
wishlistRouter.post('/remove',isAuthenticated,removeFromWishlist );

// Get user's wishlist
wishlistRouter.get('/:userId',isAuthenticated,getWishlist);

module.exports=wishlistRouter;