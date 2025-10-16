const Order = require("../models/order");

const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.userId;

    // total orders for this seller
    const orders = await Order.find({ seller: sellerId, status: "delivered" });

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    // breakdown per product
    const productSales = {};
    orders.forEach((order) => {
      order.items.forEach((itm) => {
        const pid = itm.product.toString();
        if (!productSales[pid]) productSales[pid] = { quantity: 0, revenue: 0 };
        productSales[pid].quantity += itm.quantity;
        productSales[pid].revenue += itm.price * itm.quantity;
      });
    });

    res.status(200).json({
      totalSales,
      totalOrders,
      productSales,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // find all orders for this user where paymentStatus = "Paid"
    const orders = await Order.find({ 
      user: userId, 
      status: "Paid"   // or "succeeded" depending on your schema
    })// optional: populate product details
    .sort({ createdAt: -1 });    // newest first

    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

/**
 * Endpoint to be called by payment webhook or client after payment success.
 * Body: { orderId, payment: { provider, status, paymentIntentId, stripeSessionId, raw, paidAt } }
 */
const payOrders =async(req, res) => {
  try {
    const { orderId, payment } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId required' });

    const updated = await Order.markOrderPaid(orderId, payment);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// optional create order
const createOrder =async(req, res) => {
  try {
    const payload = req.body;
    // attach buyer info from req.user
    payload.buyer = req.user.id;
    payload.buyerName = req.user.name || '';
    payload.buyerEmail = req.user.email || '';
    const order = await Order.createOrder(payload);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
}



module.exports={getSellerStats,getMyOrders,payOrders,createOrder};
