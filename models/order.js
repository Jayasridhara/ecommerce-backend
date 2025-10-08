// Example Order schema (simplified)
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
  status: { type: String, default: "pending" }, // pending, shipped, delivered, canceled
  totalAmount: Number,
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema,"orders");
