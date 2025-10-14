const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const Order = require('../models/order');

exports.paymentDetails = async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, currency = 'usd', orderId: providedOrderId } = req.body;
    // robust user id detection: check multiple fields
    const userId = req.user ? String(req.user._id || req.user.id || '') : null;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ message: 'successUrl and cancelUrl are required' });
    }

    // Build line_items for Stripe Checkout and compute totals (in cents)
    const line_items = items.map((it) => ({
      price_data: {
        currency,
        product_data: { name: it.name || it.title || 'Product' },
        unit_amount: Math.round(Number(it.price) * 100) || 0,
      },
      quantity: Number(it.qty) || 1,
    }));

    const totalAmountCents = items.reduce((sum, it) => {
      const unit = Math.round(Number(it.price) * 100) || 0;
      const qty = Number(it.qty) || 1;
      return sum + unit * qty;
    }, 0);

    // Prepare or create order to attach to session metadata
    let orderId = providedOrderId;
    try {
      const itemsSnapshot = items.map((it) => ({
        product: it.id || null,
        name: it.name || it.title || '',
        price: Number(it.price) || 0,
        quantity: Number(it.qty) || 1,
        subtotal: (Number(it.price) || 0) * (Number(it.qty) || 1),
      }));

      if (!orderId) {
        const newOrder = new Order({
          cartItems: itemsSnapshot.map(si => ({
            product: si.product,
            name: si.name,
            image: '',
            price: si.price,
            qty: si.quantity,
            subtotal: si.subtotal,
          })),
          cartCount: itemsSnapshot.length,
          totalQuantity: itemsSnapshot.reduce((s, it) => s + (it.quantity || 0), 0),
          totalAmount: totalAmountCents / 100,
          buyer: req.user ? req.user._id : undefined,
          buyerName: req.user ? (req.user.name || req.user.username || '') : '',
          items: itemsSnapshot,
          status: 'pending',
          payment: {
            provider: 'stripe',
            status: 'initiated',
            stripeSessionId: '',
            paymentIntentId: '',
            raw: { createdAt: new Date() },
          },
        });

        const saved = await newOrder.save();
        orderId = String(saved._id);
        console.log('Created pending order before session:', orderId, 'buyer:', saved.buyer);
      } else {
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            status: 'pending',
            items: itemsSnapshot,
            cartItems: itemsSnapshot.map(si => ({
              product: si.product,
              name: si.name,
              image: '',
              price: si.price,
              qty: si.quantity,
              subtotal: si.subtotal,
            })),
            cartCount: itemsSnapshot.length,
            totalQuantity: itemsSnapshot.reduce((s, it) => s + (it.quantity || 0), 0),
            totalAmount: totalAmountCents / 100,
            'payment.provider': 'stripe',
            'payment.status': 'initiated',
            'payment.raw': { initiatedAt: new Date() },
          },
        }, { new: true });
        console.log('Updated existing order to pending before session:', orderId);
      }
    } catch (err) {
      console.error('Order create/update error before creating session:', err);
      // continue — do not block checkout creation
    }

    // final fallback userId: if req.user missing, set to order buyer id
    let metaUserId = userId || '';
    if (!metaUserId && orderId) {
      try {
        const found = await Order.findById(orderId).select('buyer');
        if (found && found.buyer) metaUserId = String(found.buyer);
      } catch (e) {
        // ignore
      }
    }

    console.log('Creating stripe session for orderId:', orderId, 'userId:', metaUserId);

    // Create the checkout session with metadata that always contains orderId & userId (if available)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orderId || metaUserId || undefined,
      metadata: {
        userId: metaUserId || '',
        orderId: orderId || '',
      },
    });

    // Update order with stripe session id (best-effort)
    if (orderId) {
      try {
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            'payment.stripeSessionId': session.id,
            'payment.raw.sessionCreated': { sessionId: session.id, expectedAmountCents: totalAmountCents },
          },
        });
      } catch (err) {
        console.error('Failed to attach stripe session id to order:', err);
      }
    }

    return res.json({ sessionId: session.id, url: session.url, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.paymentSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!sessionId) return res.status(400).json({ message: 'session id required' });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    return res.json(session);
  } catch (error) {
    console.error('Retrieve checkout session error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  console.log('>>> webhook incoming - stripe-signature present?', !!sig);
  console.log('>>> raw body length:', req.body ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length) : 0);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      let session = event.data.object;

      // re-retrieve session (expanded) to ensure we have payment_intent and latest status
      try {
        session = await stripe.checkout.sessions.retrieve(session.id, { expand: ['payment_intent', 'line_items'] });
      } catch (err) {
        console.warn('Failed to re-retrieve checkout session:', err?.message || err);
      }

      const orderId = (session.metadata && session.metadata.orderId) || session.client_reference_id;
      const metaUserId = (session.metadata && session.metadata.userId) || '';
      console.log('webhook checkout.session completed - session.id:', session.id, 'orderId:', orderId, 'metaUserId:', metaUserId, 'payment_status:', session.payment_status);

      // Try to fetch payment intent for canonical data if present
      let paymentIntent = null;
      if (session.payment_intent) {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
            expand: ['charges.data.balance_transaction', 'charges.data.payment_method_details'],
          });
        } catch (err) {
          console.warn('Failed to retrieve paymentIntent:', err?.message || err);
        }
      }

      if (orderId) {
        try {
          const paymentStatus = paymentIntent ? paymentIntent.status : (session.payment_status || 'paid');
          const newStatus = (paymentStatus === 'succeeded' || paymentStatus === 'paid') ? 'succeeded' : 'paid';

          const update = {
            $set: {
              status: newStatus,
              'payment.provider': 'stripe',
              'payment.status': paymentStatus,
              'payment.stripeSessionId': session.id,
              'payment.paymentIntentId': paymentIntent ? paymentIntent.id : (session.payment_intent || ''),
              'payment.raw': {
                session,
                paymentIntent: paymentIntent || null,
              },
              paidAt: new Date(),
            },
          };

          if (paymentIntent && typeof paymentIntent.amount_received === 'number') {
            update.$set['payment.raw'].amountReceived = paymentIntent.amount_received;
            update.$set['payment.raw'].currency = paymentIntent.currency;
            const charge = paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data[0];
            if (charge) update.$set['payment.raw'].chargeId = charge.id;
          } else if (typeof session.amount_total === 'number') {
            update.$set['payment.raw'].amountTotal = session.amount_total;
            update.$set['payment.raw'].currency = session.currency || 'usd';
          }

          await Order.findByIdAndUpdate(orderId, update, { new: true });
          console.log('Order updated to payment status for orderId:', orderId);
        } catch (err) {
          console.error('Error updating order in webhook:', err);
        }
      } else {
        console.warn('No orderId in session metadata; skipping DB update.');
      }
    } else if (event.type === 'payment_intent.succeeded' || event.type === 'charge.succeeded') {
      // map paymentIntent/charge back to order for extra resilience
      const pi = event.data.object;
      const intentId = pi.id || (pi.payment_intent && pi.payment_intent.id) || null;

      if (intentId) {
        try {
          const query = {
            $or: [
              { 'payment.paymentIntentId': intentId },
              { 'payment.stripeSessionId': pi.metadata && pi.metadata.session_id ? String(pi.metadata.session_id) : undefined },
              { 'payment.raw.paymentIntent.id': intentId },
            ].filter(Boolean)
          };
          const update = {
            $set: {
              status: 'succeeded',
              'payment.provider': 'stripe',
              'payment.status': 'succeeded',
              'payment.paymentIntentId': intentId,
              'payment.raw.paymentIntent': pi,
              paidAt: new Date(),
            }
          };
          const found = await Order.findOneAndUpdate(query, update, { new: true });
          if (found) console.log('Order updated by payment_intent.succeeded for intent:', intentId, 'orderId:', found._id);
        } catch (err) {
          console.error('Error updating order from payment_intent.succeeded:', err);
        }
      }
    } else {
      console.log('Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
  }

  res.json({ received: true });
};