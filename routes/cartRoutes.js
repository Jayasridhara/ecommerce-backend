const express = require('express');
const { isAuthenticated } = require('../middlewares/auth');
const { getCart, addToCart, removeFromCart, updateQty, clearCart } = require('../controller/cartController');

const cartRouter = express.Router();

// all routes require auth
cartRouter.get('/', isAuthenticated, getCart);
cartRouter.post('/add', isAuthenticated, addToCart);
cartRouter.post('/remove', isAuthenticated, removeFromCart);
cartRouter.post('/update', isAuthenticated, updateQty);
cartRouter.post('/clear', isAuthenticated, clearCart);
module.exports = cartRouter;