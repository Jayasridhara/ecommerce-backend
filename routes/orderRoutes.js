const express = require('express');
const { isAuthenticated } = require('../middlewares/auth');
const { getMyOrders, getSellerReports,  } = require('../controller/orderController');


const orderRouter = express.Router();
orderRouter.get('/my', isAuthenticated, getMyOrders);

orderRouter.get('/seller-reports', isAuthenticated, getSellerReports);

module.exports = orderRouter;