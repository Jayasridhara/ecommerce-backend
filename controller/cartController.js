const mongoose = require('mongoose');
const Order = require('../models/order');
const User = require('../models/User');
const Product = require('../models/Product');


/**
 * Helper: recalc totals & counts and update per-item subtotal.
 */
function recalcCart(cart) {
    try {
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
    } catch (er) {
        console.log("from recalcualte ", er);
    }

}

/**
 * Return cart (fresh) — if not exist create one.
 */
exports.getCart = async(req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const data = await User.findOne({ _id: userId });
        if (!data.cartItems) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        return res.status(200).json({ cart: data.cartItems });
    } catch (err) {
        console.error('getCart error', err);
        return res.status(500).json({ message: err.message });
    }
};


exports.addToCart = async(req, res) => {
    try {
        const userId = req.user.userId;
        const { productId, qty = 1 } = req.body;

        // load product and seller snapshot
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User Details is not there" });

        let updatedUser;
        const isExisting = user.cartItems.some(ele => ele.productId.toString() == productId);
        if (isExisting) {
            updatedUser = await User.findOneAndUpdate({ _id: userId, "cartItems.productId": productId }, { $inc: { "cartItems.$.qty": Number(qty) } }, { new: true });
        } else {
            const cartItem = {
                productId: productId,
                name: product.name, // product snapshot
                image: product.image,
                price: Number(product.price), // unit price snapshot
                qty: Number(qty),
                subtotal: 0,
                seller: {
                    id: product.seller ? product.seller.id : undefined,
                    name: product.seller ? product.seller.name : undefined,
                    email: product.seller ? product.seller.email : undefined
                },
                status: 'cart',
            }
            updatedUser = await User.findOneAndUpdate({ _id: userId }, { $push: { cartItems: cartItem } }, { new: true });
        }

        if (updatedUser.cartItems.length > 1) {
            recalcCart(updatedUser);
            await updatedUser.save();
        }

        return res.status(200).json({ cart: updatedUser });
    } catch (err) {
        console.error('addToCart error', err);
        return res.status(500).json({ message: err.message });
    }
};

exports.removeFromCart = async(req, res) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User Details is not there" });

        if (!user.cartItems) return res.status(404).json({ message: 'Cart not found' });

        const updatedUser = await User.findByIdAndUpdate(
            userId, { $pull: { cartItems: { productId: productId } } }, { new: true }
        );
        recalcCart(updatedUser);
        await updatedUser.save();

        return res.status(200).json({ cart: updatedUser });
    } catch (err) {
        console.error('removeFromCart error', err);
        return res.status(500).json({ message: err.message });
    }
};

exports.updateQty = async(req, res) => {
    try {
        const userId = req.user.userId;
        const { productId, qty } = req.body;
        console.log("qty", qty);
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });

        const user = await User.findById(userId);
        if (!user.cartItems) return res.status(404).json({ message: 'Cart not found' });

        const item = user.cartItems.filter((i) => i.productId.toString() === productId.toString());
        console.log("item", item)
        if (!item) return res.status(404).json({ message: 'Product not in cart' });

        const updatedUser = await User.findOneAndUpdate({ _id: userId, "cartItems.productId": productId }, { $set: { "cartItems.$.qty": Number(qty) } }, { new: true });


        recalcCart(updatedUser);
        await updatedUser.save();

        return res.status(200).json({ cart: updatedUser });
    } catch (err) {
        console.error('updateQty error', err);
        return res.status(500).json({ message: err.message });
    }
};

exports.clearCart = async(req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).json({ cart: { cartItems: [], cartCount: 0, totalAmount: 0, totalQuantity: 0 } });
        }
        const updatedUser = await User.findOneAndUpdate({ _id: userId }, { $set: { cartItems: [] } }, { new: true })
        return res.status(200).json({ cart: updatedUser });
    } catch (err) {
        console.error('clearCart error', err);
        return res.status(500).json({ message: err.message || 'Server error' });
    }
};