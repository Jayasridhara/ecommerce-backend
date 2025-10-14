// Example Order schema (simplified)
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],
  // order lifecycle status
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'paid', 'failed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  totalAmount: Number,

  // payment details filled by webhook
  payment: {
    provider: { type: String },          // e.g. "stripe"
    status: { type: String },            // e.g. "paid", "requires_payment_method"
    stripeSessionId: { type: String },
    paymentIntentId: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed }, // optional raw object for debugging
  },

  // timestamp when payment confirmed
  paidAt: { type: Date },

}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = Order;
