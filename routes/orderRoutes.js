const express = require('express');
const { isAuthenticated, allowUsers } = require('../middlewares/auth');
const { getMyOrders, getSellerReports, updateOrderStatusBySeller,  } = require('../controller/orderController');


const orderRouter = express.Router();
orderRouter.get('/my', isAuthenticated, getMyOrders);

orderRouter.get('/seller-reports', isAuthenticated, getSellerReports);

orderRouter.patch('/seller-status', isAuthenticated,allowUsers(['seller']),updateOrderStatusBySeller);
module.exports = orderRouter;