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


module.exports={getSellerStats,updateCart,cartItemsList};