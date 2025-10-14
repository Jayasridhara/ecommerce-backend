const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/Product');
const User = require('../models/User'); // used to resolve buyer name

/**
 * Helper: recalc totals & counts and update per-item subtotal.
 */
function recalcCart(cart) {
  let total = 0;
  let count = 0;
  cart.cartItems.forEach((it) => {
    it.price = Number(it.price || 0);
    it.qty = Number(it.qty || 0);
    it.subtotal = Math.round((it.price * it.qty + Number.EPSILON) * 100) / 100;
    total += it.subtotal;
    count += it.qty;
  });
  cart.totalAmount = Math.round((total + Number.EPSILON) * 100) / 100;
  cart.totalQuantity = count;
  cart.cartCount = count;
}

/**
 * Return cart (fresh) — if not exist create one.
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.userId;
    let cart = await Order.findOne({ buyer: userId, status: 'cart' });
    if (!cart) {
      const user = userId ? await User.findById(userId).select('name email') : null;
      cart = await Order.create({
        buyer: userId || null,
        buyerName: user ? user.name : undefined,
        status: 'cart',
        cartItems: [],
        cartCount: 0,
        totalQuantity: 0,
        totalAmount: 0,
      });
    }
    // ensure computed totals are present
    recalcCart(cart);
    await cart.save();
    return res.status(200).json({ cart });
  } catch (err) {
    console.error('getCart error', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, qty = 1 } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });

    // load product and seller snapshot
    const product = await Product.findById(productId).populate('seller', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let cart = await Order.findOne({ buyer: userId, status: 'cart' });
    if (!cart) {
      const user = userId ? await User.findById(userId).select('name email') : null;
      cart = new Order({
        buyer: userId || null,
        buyerName: user ? user.name : undefined,
        status: 'cart',
        cartItems: [],
      });
    }

    const existing = cart.cartItems.find((i) => String(i.product) === String(product._id));
    if (existing) {
      existing.qty = Number(existing.qty) + Number(qty);
      existing.price = Number(product.price); // update unit price snapshot
      existing.name = product.name;
      existing.image = product.image;
      existing.seller = {
        id: product.seller ? product.seller._id : undefined,
        name: product.seller ? product.seller.name : undefined,
        email: product.seller ? product.seller.email : undefined,
      };
    } else {
      cart.cartItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: Number(product.price),
        qty: Number(qty),
        subtotal: Math.round((Number(product.price) * Number(qty) + Number.EPSILON) * 100) / 100,
        seller: {
          id: product.seller ? product.seller._id : undefined,
          name: product.seller ? product.seller.name : undefined,
          email: product.seller ? product.seller.email : undefined,
        },
      });
    }

    // set buyerName if missing
    if (!cart.buyerName && userId) {
      const user = await User.findById(userId).select('name email');
      if (user) cart.buyerName = user.name;
    }

    recalcCart(cart);
    await cart.save();

    return res.status(200).json({ cart });
  } catch (err) {
    console.error('addToCart error', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });

    const cart = await Order.findOne({ buyer: userId, status: 'cart' });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.cartItems = cart.cartItems.filter((i) => String(i.product) !== String(productId));
    recalcCart(cart);
    await cart.save();

    return res.status(200).json({ cart });
  } catch (err) {
    console.error('removeFromCart error', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateQty = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, qty } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });
    const newQty = Number(qty);
    if (isNaN(newQty) || newQty < 0) return res.status(400).json({ message: 'Invalid qty' });

    const cart = await Order.findOne({ buyer: userId, status: 'cart' });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.cartItems.find((i) => String(i.product) === String(productId));
    if (!item) return res.status(404).json({ message: 'Product not in cart' });

    if (newQty === 0) {
      cart.cartItems = cart.cartItems.filter((i) => String(i.product) !== String(productId));
    } else {
      item.qty = newQty;
      item.subtotal = Math.round((item.price * item.qty + Number.EPSILON) * 100) / 100;
    }

    recalcCart(cart);
    await cart.save();

    return res.status(200).json({ cart });
  } catch (err) {
    console.error('updateQty error', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.userId;
    const cart = await Order.findOne({ buyer: userId, status: 'cart' });
    if (!cart) {
      return res.status(200).json({ cart: { cartItems: [], cartCount: 0, totalAmount: 0, totalQuantity: 0 } });
    }

    cart.cartItems = [];
    cart.cartCount = 0;
    cart.totalAmount = 0;
    cart.totalQuantity = 0;

    await cart.save();
    return res.status(200).json({ cart });
  } catch (err) {
    console.error('clearCart error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};