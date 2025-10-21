const { isAuthenticated } = require("../middlewares/auth");
const Order = require("../models/order");
const sendEmail = require("../utils/email");

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    // find all orders for this user where paymentStatus = "Paid"
    const orders = await Order.find({ 
     "buyer.id": userId, 
      status: "paid"   // or "paid" depending on your schema
    })// optional: populate product details
    .sort({ createdAt: -1 });    // newest first
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
      status: 'paid'
    });
    const filteredOrders = orders.map(order => {
      const sellerItems = order.cartItems.filter(item => item.seller.id.toString() === sellerId.toString());
      return {  
        ...order.toObject(),
        cartItems: sellerItems
      };
    });
    res.json({ orders: filteredOrders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


//update order status by seller
const updateOrderStatusBySeller = async (req, res) => {
  try {
    console.log("Received updateOrderStatusBySeller request:", req.body);

    const sellerId = req.user._id;
    console.log("Authenticated seller ID:", sellerId);

    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ message: "orderId and status are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let itemFound = false;
    const now = new Date();

    order.cartItems.forEach((item) => {
      const itemSellerId = item.seller?._id || item.seller?.id;

      console.log(
        "Checking item seller:",
        itemSellerId ? itemSellerId.toString() : null,
        "against",
        sellerId.toString()
      );

      if (itemSellerId && itemSellerId.toString() === sellerId.toString()) {
        itemFound = true;
        item.status = status;

        // ✅ Set timestamps based on status
        if (status === "shipped") {
          item.shippedAt = now;
          //send email to buyer that item has been shipped
         
             sendEmail({
              email: order.buyer.email,
              subject: `Your order ${order._id} has been shipped! 🚚`,
              message: `Hello ${order.buyer.name},\n\nYour order with ID ${order._id} has been shipped by the seller.`
            });
          
        } else if (status === "delivered") {
          item.deliveredAt = now;
          //send email to buyer that item has been delivered
          
             sendEmail({
              email: order.buyer.email,
              subject: `Your order ${order._id} has been delivered! 📦`,
              message: `Hello ${order.buyer.name},\n\nYour order with ID ${order._id} has been delivered. Enjoy your purchase!`
            });
        }
      }
    });

    if (!itemFound) {
      return res.status(403).json({ message: "You are not authorized to update this order" });
    }

    await order.save();

    res.json({
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    console.error("Failed to update order status:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};



module.exports={getSellerReports,getMyOrders,updateOrderStatusBySeller};
