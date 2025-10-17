const { isAuthenticated } = require("../middlewares/auth");
const Order = require("../models/order");

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("requestreq ;",req.user.userId)
    // find all orders for this user where paymentStatus = "Paid"
    const orders = await Order.find({ 
      buyer: userId, 
      status: "succeeded"   // or "succeeded" depending on your schema
    })// optional: populate product details
    .sort({ createdAt: -1 });    // newest first
    console.log("orders:",orders)
    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

const getSellerReports=async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const orders = await Order.find({
      'cartItems.seller.id': sellerId, // match logged-in seller
      status: 'succeeded'
    });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports={getSellerReports,getMyOrders};
