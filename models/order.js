// Example Order schema (simplified)
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // cart with per-item snapshots (kept up-to-date by cart controller)
  cartItems: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // reference for lookups
      name: { type: String },      // product snapshot
      image: { type: String },
      price: { type: Number, default: 0 }, // unit price snapshot
      qty: { type: Number, default: 1 },
      subtotal: { type: Number, default: 0 }, // price * qty
      seller: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String },
        email: { type: String },
      },
      shippingAddress: {
      fullName: { type: String },
      addressLine1: { type: String }, 
      addressLine2: { type: String },   
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
      phone: { type: String },
  },
    },
  ],
  cartCount: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 }, // total items (sum qty)
  totalAmount: { type: Number, default: 0 }, // total price for cartItems

  // buyer/seller top-level references and snapshots
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  buyerName: { type: String },
  buyerEmail: { type: String },
  seller: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
  },   

  // order lifecycle status
  status: {
    type: String,
    enum: ['cart', 'pending', 'processing', 'succeeded','failed', 'shipped', 'delivered', 'cancelled'],
    default: 'cart',
  },

  // payment details filled by webhook
  payment: {
    provider: { type: String },
    status: { type: String },
    stripeSessionId: { type: String },
    paymentIntentId: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },

  // timestamp when payment confirmed
  paidAt: { type: Date },
  deliveryExpectedAt: { type: Date },


}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = Order;
