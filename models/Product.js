const mongoose=require('mongoose');

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

    // optional: to track which seller added it
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports=mongoose.model('Product',productSchema,'products')
