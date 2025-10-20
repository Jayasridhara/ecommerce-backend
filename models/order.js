// // Example Order schema (simplified)
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   // cart with per-item snapshots (kept up-to-date by cart controller)
//   cartItems: [
//     {
//       product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
//       user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // reference for lookups
//       name: { type: String },      // product snapshot
//       image: { type: String },
//       price: { type: Number, default: 0 }, // unit price snapshot
//       qty: { type: Number, default: 1 },
//       subtotal: { type: Number, default: 0 }, // price * qty
//       seller: {
//         id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         name: { type: String },
//         email: { type: String },
//       },
//       shippingAddress: {
//       fullName: { type: String },
//       addressLine1: { type: String }, 
//       addressLine2: { type: String },   
//       city: { type: String },
//       state: { type: String },
//       postalCode: { type: String },
//       country: { type: String },
//       phone: { type: String },
//   },
//     },
//   ],
//   cartCount: { type: Number, default: 0 },
//   totalQuantity: { type: Number, default: 0 }, // total items (sum qty)
//   totalAmount: { type: Number, default: 0 }, // total price for cartItems

//   // buyer/seller top-level references and snapshots
//   buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   buyerName: { type: String },
//   buyerEmail: { type: String },
//   seller: {
//         id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//         name: String,
//         email: String,
//   },   

//   // order lifecycle status
//   status: {
//     type: String,
//     enum: ['cart', 'pending', 'processing', 'succeeded','failed', 'shipped', 'delivered', 'cancelled'],
//     default: 'cart',
//   },

//   // payment details filled by webhook
//   payment: {
//     provider: { type: String },
//     status: { type: String },
//     stripeSessionId: { type: String },
//     paymentIntentId: { type: String },
//     raw: { type: mongoose.Schema.Types.Mixed },
//   },

//   // timestamp when payment confirmed
//   paidAt: { type: Date },
//   deliveryExpectedAt: { type: Date },


// }, { timestamps: true });

// const Order = mongoose.model("Order", orderSchema, "orders");
// module.exports = Order;

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
    },

    cartItems: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true }, // product snapshot
        image: { type: String },
        price: { type: Number, required: true },
        qty: { type: Number, default: 1 },
        subtotal: { type: Number, default: 0 },
        seller: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
        },

        status: {
        type: String,
        enum: ['cart','paid', 'shipped', 'delivered', 'cancelled'],
        default: 'cart',
         },
        deliveryExpectedAt: { type: Date },
        shippedAt : { type: Date },
        deliveredAt: { type: Date },
    }],

    cartCount: { type: Number, default: 0 }, // distinct products
    totalQuantity: { type: Number, default: 0 }, // sum of qty
    totalAmount: { type: Number, default: 0 }, // sum of subtotal

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

    payment: {
        provider: { type: String }, // e.g., stripe
        method: { type: String }, // e.g., card
        status: { type: String, default: 'pending' },
        transactionId: { type: String },
        stripeSessionId: { type: String },
        paymentIntentId: { type: String },
        amountPaid: { type: Number },
        sessionId: { type: String },
        currency: { type: String, default: 'INR' },
        paidAt: { type: Date },
        raw: { type: mongoose.Schema.Types.Mixed },
    },

    status: {
        type: String,
        enum: ['cart', 'pending', 'processing', 'paid', 'failed', 'shipped', 'delivered', 'cancelled'],
        default: 'cart',
    },

    

}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema, 'orders');
module.exports = Order;