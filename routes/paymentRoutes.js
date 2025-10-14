const express = require('express');

const { isAuthenticated } = require('../middlewares/auth');
const { paymentDetails, paymentSession, stripeWebhook } = require('../controller/paymentController');

const paymentRouter = express.Router();

/**
 * POST /create-checkout-session
 * body: { items: [{ id, name, price, qty }], successUrl, cancelUrl, orderId? }
 */
paymentRouter.post('/create-checkout-session', isAuthenticated, paymentDetails);

paymentRouter.get('/session/:id', isAuthenticated, paymentSession);

// Stripe will POST events here. Use express.raw to get the raw body for signature verification.
// IMPORTANT: do NOT protect this with isAuthenticated
// paymentRouter.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = paymentRouter;