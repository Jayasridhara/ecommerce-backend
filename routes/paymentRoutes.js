const express = require('express');

const { isAuthenticated } = require('../middlewares/auth');
const { paymentDetails, paymentSession } = require('../controller/paymentController');

const paymentRouter = express.Router();

/**
 * POST /create-checkout-session
 * body: { items: [{ id, name, price, qty }], successUrl, cancelUrl, currency? }
 * Returns { sessionId, url }
 */
paymentRouter.post('/create-checkout-session', isAuthenticated, paymentDetails);

paymentRouter.get('/session/:id', isAuthenticated, paymentSession);

module.exports = paymentRouter;