const express = require('express');
const { isAuthenticated } = require('../middlewares/auth');
const { getMyOrders, payOrders, createOrder } = require('../controller/orderController');


const orderRouter = express.Router();
orderRouter.get('/my', isAuthenticated, getMyOrders);

//Mark order paid (client or webhook) -> sets paidAt and deliveryExpectedAt
orderRouter.post('/pay', isAuthenticated, payOrders);

// Create order (optional)
orderRouter.post('/', isAuthenticated, createOrder);

module.exports = orderRouter;