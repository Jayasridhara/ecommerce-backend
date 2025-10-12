const express = require('express');

const { isAuthenticated } = require('../middlewares/auth');
const { paymentDetails, paymentSession, stripeWebhook } = require('../controller/paymentController');

const paymentRouter = express.Router();

/**
 * POST /create-checkout-session
 * body: { items: [{ id, name, price, qty }], successUrl, cancelUrl, currency? }
 * Returns { sessionId, url }
 */
paymentRouter.post('/create-checkout-session', isAuthenticated, paymentDetails);

paymentRouter.get('/session/:id', isAuthenticated, paymentSession);

paymentRouter.get('/webhook', isAuthenticated,express.raw({ type: 'application/json' }),stripeWebhook);

module.exports = paymentRouter;