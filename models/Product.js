const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    color: { type: String },
    productType: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    seller: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            email: String,
      }, 
    stock: { type: Number, default: 0 },           // how many items in stock
    category: { type: String },                     // perhaps a more formal category
    salesCount: { type: Number, default: 0 },       // number of times sold (for reports)
    // You can track reviews, or a reviews subdocument
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: Number,
        comment: String,
        createdAt: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema, "products");
