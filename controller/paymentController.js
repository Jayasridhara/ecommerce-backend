const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const Order = require('../models/order'); // ensure this model exists

exports.paymentDetails = async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, currency = 'usd', orderId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ message: 'successUrl and cancelUrl are required' });
    }

    // Build line_items for Stripe Checkout
    const line_items = items.map((it) => ({
      price_data: {
        currency,
        product_data: { name: it.name },
        // IMPORTANT: Stripe expects amount in smallest currency unit (cents)
        unit_amount: Math.round(Number(it.price) * 100),
      },
      quantity: Number(it.qty) || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // pass orderId so webhook can update the right order
      client_reference_id: orderId || (req.user ? String(req.user._id) : undefined),
      metadata: {
        userId: req.user ? String(req.user._id) : '',
        orderId: orderId ? String(orderId) : '',
      },
    });

    return res.json({ sessionId: session.id, url: session.url, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
}
exports.paymentSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!sessionId) return res.status(400).json({ message: 'session id required' });

    // Expand line_items so we can show purchased products
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    return res.json(session);
  } catch (error) {
    console.error('Retrieve checkout session error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
}
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
   console.log('>>> webhook incoming: headers stripe-signature present?', !!sig);
  console.log('>>> webhook raw body length:', req.body ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length) : 0);
  let event;

  try {
    // use raw body (see app.js change below)
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const orderId = metadata.orderId || metadata.order_id || session.client_reference_id;

    try {
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            status: 'succeeded', // or 'paid'
            'payment.provider': 'stripe',
            'payment.status': session.payment_status || 'paid',
            'payment.stripeSessionId': session.id,
            'payment.paymentIntentId': session.payment_intent || '',
            paidAt: new Date(),
          },
        });
        console.log('Order updated to succeeded for orderId:', orderId);
      } else {
        // optionally create an order here if you didn't create it earlier
        console.log('No orderId in session metadata; skipping DB update.');
      }
    } catch (err) {
      console.error('Failed updating order after webhook:', err);
    }
  }

  // respond quickly to Stripe
  res.json({ received: true });
};