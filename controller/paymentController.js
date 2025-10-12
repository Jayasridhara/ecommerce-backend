const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.paymentDetails = async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, currency = 'usd' } = req.body;

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
        product_data: {
          name: it.name,
        },
        unit_amount: Math.round(Number(it.price)), // assume frontend already converted to cents if required
      },
      quantity: Number(it.qty) || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // attach user info for webhook / reference
      client_reference_id: req.user ? String(req.user._id) : undefined,
      metadata: {
        userId: req.user ? String(req.user._id) : '',
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