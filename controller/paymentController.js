const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const Order = require('../models/order');
const User = require('../models/User'); // <-- added

const mapItemsToCartItems = (items) => items.map((it) => ({
  product: it.id || null,
  name: it.name || it.title || '',
  image: it.image || '', // Assuming image might be present in item
  price: Number(it.price) || 0,
  qty: Number(it.qty) || 1,
  subtotal: (Number(it.price) || 0) * (Number(it.qty) || 1),
}));

const calculateTotalAmountCents = (items) => items.reduce((sum, it) => {
  const unit = Math.round(Number(it.price) * 100) || 0;
  const qty = Number(it.qty) || 1;
  return sum + unit * qty;
}, 0);

exports.paymentDetails = async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, currency = 'usd', orderId: providedOrderId, shippingAddress } = req.body;
    const userId = req.user ? req.user.userId : null
    console.log("user=ID",userId) // Prefer authenticated user, else use provided userId
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ message: 'successUrl and cancelUrl are required' });
    }

    const line_items = items.map((it) => ({
      price_data: {
        currency,
        product_data: { name: it.name || it.title || 'Product' },
        unit_amount: Math.round(Number(it.price) * 100) || 0,
      },
      quantity: Number(it.qty) || 1,
    }));

    const totalAmountCents = calculateTotalAmountCents(items);
    const cartItemsSnapshot = mapItemsToCartItems(items);

    let orderId = providedOrderId;
    try {
      const orderUpdateData = {
        cartItems: cartItemsSnapshot,
        cartCount: cartItemsSnapshot.length,
        totalQuantity: cartItemsSnapshot.reduce((s, it) => s + (it.qty || 0), 0),
        totalAmount: totalAmountCents / 100,
        status: 'pending',
        'payment.provider': 'stripe',
        'payment.status': 'initiated',
        'payment.raw': { initiatedAt: new Date() },
      };

      // Build buyer info — prefer authenticated req. , fallback to provided userId
      let buyerInfo = {};
      {
        const user = await User.findById(req.user.userId).select('name email');
        if (user) {
          buyerInfo = {
            buyer: user._id,
            buyerName: user.name || '',
            buyerEmail: user.email || '',
          };
        }
      }

      // If frontend supplied a shippingAddress, attach it (optional)
      if (shippingAddress && typeof shippingAddress === 'object') {
        // Map expected top-level shipping fields if your schema supports them
        orderUpdateData.shippingAddress = shippingAddress;
      }

      if (!orderId) {
        const newOrder = new Order({
          ...orderUpdateData,
          ...buyerInfo, // Include buyer info for new orders
        });
        const saved = await newOrder.save();
        orderId = String(saved._id);
      } else {
        // When updating an existing order, also update buyer and buyerName/email
        await Order.findByIdAndUpdate(orderId, { $set: { ...orderUpdateData, ...buyerInfo } }, { new: true });
      }
    } catch (err) {
      console.error('Order create/update error before creating session:', err);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orderId || req.user._id || undefined,
      metadata: {
        userId: userId ? String(userId) : '',
        orderId: orderId ? String(orderId) : '',
      },
    });

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
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items', 'payment_intent'] });
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
      const session = event.data.object;
      const orderId = (session.metadata && session.metadata.orderId) || session.client_reference_id;
      console.log('checkout.session completed - session.id:', session.id, 'orderId:', orderId, 'payment_status:', session.payment_status);

      let paymentIntent = null;
      if (session.payment_intent) {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['charges.data.balance_transaction', 'charges.data.payment_method_details'] });
        } catch (err) {
          console.warn('Failed to retrieve paymentIntent:', err?.message || err);
        }
      }

      // Derive buyer / billing / shipping from session/paymentIntent (if available)
      const customer = session.customer_details || {};
      const billingFromIntent = (paymentIntent && paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data[0]) || null;
      const billingDetails = billingFromIntent ? billingFromIntent.billing_details : (paymentIntent ? paymentIntent.billing_details : null);

      // Build update object
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
              'payment.raw': { session, paymentIntent: paymentIntent || null },
              paidAt: new Date(),
            },
          };

          // attach amounts
          if (paymentIntent && typeof paymentIntent.amount_received === 'number') {
            update.$set['payment.raw'].amountReceived = paymentIntent.amount_received;
            update.$set['payment.raw'].currency = paymentIntent.currency;
            const charge = paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data[0];
            if (charge) update.$set['payment.raw'].chargeId = charge.id;
          } else if (typeof session.amount_total === 'number') {
            update.$set['payment.raw'].amountTotal = session.amount_total;
            update.$set['payment.raw'].currency = session.currency || 'usd';
          }

          // attach buyer name/email from session if present
          if (customer.name || customer.email) {
            update.$set['name'] = customer.name || undefined;
            update.$set['email'] = customer.email || session.customer_email || undefined;
          }

          // attach shipping address if provided by Stripe Checkout (map to your schema)
          if (customer.address) {
            const addr = customer.address;
            update.$set['shippingAddress'] = {
              fullName: customer.name || '',
              addressLine1: addr.line1 || '',
              addressLine2: addr.line2 || '',
              city: addr.city || '',
              state: addr.state || '',
              postalCode: addr.postal_code || '',
              country: addr.country || '',
              phone: customer.phone || '',
            };
          }

          // attach card-holder name if available
          if (billingDetails && billingDetails.name) {
            update.$set['payment.cardHolderName'] = billingDetails.name;
          } else if (billingFromIntent && billingFromIntent.billing_details && billingFromIntent.billing_details.name) {
            update.$set['payment.cardHolderName'] = billingFromIntent.billing_details.name;
          }

          await Order.findByIdAndUpdate(orderId, update, { new: true });
          console.log('Order updated to payment status for orderId:', orderId);
        } catch (err) {
          console.error('Error updating order in webhook:', err);
        }
      } else {
        console.warn('No orderId in session metadata; skipping DB update.');
      }
    } 
    //else if (event.type === 'payment_intent.succeeded' || event.type === 'charge.succeeded') {
    //   const pi = event.data.object;
    //   const intentId = pi.id || (pi.payment_intent && pi.payment_intent.id) || null;

    //   if (intentId) {
    //     try {
    //       const query = {
    //         $or: [
    //           { 'payment.paymentIntentId': intentId },
    //           { 'payment.stripeSessionId': pi.metadata && pi.metadata.session_id ? String(pi.metadata.session_id) : undefined },
    //           { 'payment.raw.paymentIntent.id': intentId },
    //         ].filter(Boolean),
    //       };

    //       const update = {
    //         $set: {
    //           status: 'succeeded',
    //           'payment.provider': 'stripe',
    //           'payment.status': 'succeeded',
    //           'payment.paymentIntentId': intentId,
    //           'payment.raw.paymentIntent': pi,
    //           paidAt: new Date(),
    //         },
    //       };

    //       // attach billing details if present
    //       const charge = pi.charges && pi.charges.data && pi.charges.data[0];
    //       const billing = charge ? charge.billing_details : pi.billing_details;
    //       if (billing) {
    //         if (billing.name) update.$set['payment.cardHolderName'] = billing.name;
    //         if (billing.email) update.$set['buyerEmail'] = billing.email;
    //       }

    //       const found = await Order.findOneAndUpdate(query, update, { new: true });
    //       if (found) console.log('Order updated by payment_intent.succeeded for intent:', intentId, 'orderId:', found._id);
    //     } catch (err) {
    //       console.error('Error updating order from payment_intent.succeeded:', err);
    //     }
    //   }
    // } 
    else {
      console.log('Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
  }
  res.json({ received: true });
};

