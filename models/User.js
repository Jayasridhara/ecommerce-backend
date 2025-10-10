const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
  ]
}, { timestamps: true })

module.exports=mongoose.model('User',userSchema,'users');