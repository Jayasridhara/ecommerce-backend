const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String },
    role: { type: String, enum: ['admin', 'seller', 'buyer'], default: 'buyer' },
    profilePicture: { type: String, default: '' },
    phone: { type: String },
    location: { type: String }, 
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
    
  ],
  shippingAddress: {
    fullName: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    phone: { type: String, default: '' },
   
  }, 
   cartItems: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String }, // product snapshot
        image: { type: String },
        price: { type: Number, default: 0 }, // unit price snapshot
        qty: { type: Number, default: 1 },
        subtotal: { type: Number, default: 0 },
        seller: {
            id: { type: mongoose.Schema.Types.ObjectId },
            name: { type: String },
            email: { type: String },
        }
    }],

   // seller-specific fields
  shopName: { type: String, default: '' },
  shopAddress: {
    fullName: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    phone: { type: String, default: '' },   
   
    // optionally add any seller-specific fields here
  },

}, { timestamps: true })

module.exports=mongoose.model('User',userSchema,'users');