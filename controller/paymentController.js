  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const Order = require('../models/order');
  const Product = require('../models/Product');
  const User = require('../models/User'); // <-- added
  const sendEmail=require('../utils/email')
  const mapItemsToCartItems = (items) => items.map((it) => ({
    product: it.id || null,
    name: it.name || it.title || '',
    image: it.image || '', // Assuming image might be present in item
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 1,
    subtotal: (Number(it.price) || 0) * (Number(it.qty) || 1),
    seller: {
      id:it.seller.id,
      name:it.seller.name,
      email:it.seller.email
    },
    status: it.seller.status || 'cart',
  }));

  const calculateTotalAmountCents = (items) => items.reduce((sum, it) => {
    const unit = Math.round(Number(it.price) * 100) || 0;
    const qty = Number(it.qty) || 1;
    return sum + unit * qty;
  }, 0);

  exports.paymentDetails = async (req, res) => {
    try {
      const { items, successUrl, cancelUrl, currency = 'usd', orderId: providedOrderId, shippingAddress } = req.body;
      console.log("paymentDetails items",items)
      console.log('orderId:', providedOrderId);
      const userId = req.user ? req.user.userId : null
      console.log("user=ID",userId) // Prefer authenticated user, else use provided userId

      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'No items provided' });
      }
      if (!successUrl || !cancelUrl) {
        return res.status(400).json({ message: 'successUrl and cancelUrl are required' });
      }

      // Fetch user info
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const cartItemsSnapshot = mapItemsToCartItems(items);

      const line_items = items.map((it) => ({
        price_data: {
          currency,
          product_data: { name: it.name || it.title || 'Product' },
          unit_amount: Math.round(Number(it.price) * 100) || 0,
        },
        quantity: Number(it.qty) || 1,
      }));

      const totalAmountCents = calculateTotalAmountCents(items);
      const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              mode: 'payment',
              line_items,
              success_url: successUrl,
              cancel_url: cancelUrl,
              client_reference_id: userId.toString(), // use user ID here, must not be empty
              metadata: {
                  userId: userId.toString(),
              },
          });
          
       // Now create the order with Stripe session ID
        const orderPayload = {
            buyer: {
                id: userId,
                name: user.name,
                email: user.email,
            },
            cartItems: cartItemsSnapshot,
            cartCount: cartItemsSnapshot.length,
            totalQuantity: cartItemsSnapshot.reduce((sum, i) => sum + i.qty, 0),
            totalAmount: cartItemsSnapshot.reduce((sum, i) => sum + i.subtotal, 0),
            shippingAddress: shippingAddress || {},
            status: 'cart',
            payment: {
                provider: 'stripe',
                status: 'pending',
                stripeSessionId: session.id,
                raw: { sessionCreated: { expectedAmountCents: totalAmountCents } },
                amountPaid: "",
                paidAt: Date.now()
            },
        };

        const order = Order.create(orderPayload);

        return res.json({
            sessionId: session.id,
            url: session.url,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            orderId: order._id,
        });
    
    
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
    if (session.payment_intent.status === "succeeded") 
      {
              const updatedOrder = await Order.findOneAndUpdate(
              { "payment.stripeSessionId": sessionId },
              {
                $set: {
                  "payment.status": "paid",
                  status: "paid",       // optionally update overall order status
                  "payment.paymentIntentId": session.payment_intent.id,
                  "payment.paidAt": new Date(),
                }
                },
                { new: true });
              console.log("Order marked as paid:", updatedOrder ? updatedOrder._id : "not found");
              //order cartitems status update
              for(const item of updatedOrder.cartItems)
              {

                item.status="paid";
                item.deliveryExpectedAt=new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

              }
              await updatedOrder.save();
                // Clear user's cartItems after successful payment
               if (req.user && req.user.userId)
                {
                      try {
                        await User.findByIdAndUpdate(
                          req.user.userId,
                          { $set: { cartItems: [] } }
                        );
                      } catch (err) {
                        console.warn("Failed to clear user.cartItems:", err);
                    }
                }

                //increase sales count and decrease stock
                for(const item of updatedOrder.cartItems)
                { 
                  try{  
                    await Product.findByIdAndUpdate(
                      item.product,
                      { $inc: { salesCount: item.qty, stock: -item.qty } }
                    );
                  }
                  catch(err){
                    console.error("Failed to update product stock/salesCount for product:", item.product, err);
                  }
                }
                console.log("updatedOrder",updatedOrder);

                // //send email to user
                // try{
                //   const email=updatedOrder.buyer.email;
                //   const subject="Order Payment Successful";
                //   const message=`<h1>Dear ${updatedOrder.buyer.name},</h1>
                //   <p>Your payment for order ${updatedOrder._id} has been successfully processed.</p>
                //   <p>Thank you for shopping with us!</p>`;
                //   await sendEmail({email,subject,message});
                // }catch(err){
                //   console.error("Failed to send payment success email:", err);
                // }
                //end email
                // //send email to seller  
                // try{
                //   for(const item of updatedOrder.cartItems)
                //   {
                //     const email=item.seller.email;
                //     const subject="Product Sold Notification";
                //     const message=`<h1>Dear ${item.seller.name},</h1>
                //     <p>Your product "${item.name}" has been sold in order ${updatedOrder._id}.</p>
                //     <p>Please prepare it for shipping.</p>`;
                //     await sendEmail({email,subject,message});
                //   }
                // }catch(err){
                //   console.error("Failed to send seller notification email:", err);
                // }
        }
        else
        {
          //update order as failed
          const updatedOrder = await Order.findOneAndUpdate(
            { "payment.stripeSessionId": sessionId },
            {
              $set: {
                "payment.status": "failed",
                status: "failed",       // optionally update overall order status
                "payment.paymentIntentId": session.payment_intent.id,
              }
              },
              { new: true });
            console.log("Order marked as failed:", updatedOrder ? updatedOrder._id : "not found");
            
        }
        console.log("sesiio", session)
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
            let newStatus = 'pending';   
            if(paymentStatus === 'succeeded') {
              newStatus = "succeeded"
                //send email
            }
            else if( paymentStatus === 'paid')
            {
              newStatus = "paid"
            }
            else{
              newStatus = "failed"
            }
            const update = {
              $set: {
                status: newStatus,
                "paymentStatus": session.payment_status,
                'payment.provider': 'stripe',
                'payment.status': paymentStatus,
                'payment.stripeSessionId': session.id,
                "amountPaid": session.amount_total / 100, // convert cents to USD
                "currency": session.currency,
                'payment.paymentIntentId': paymentIntent ? paymentIntent.id : (session.payment_intent || ''),
                'payment.raw': { session, paymentIntent: paymentIntent || null },
                paidAt: new Date(),
                deliveryExpectedAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
              },
            };
            console.log("status paymenrt",update);
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
            if (paymentIntent?.payment_details) {
              update.$set['payment.details'] = {
                customer_reference: paymentIntent.payment_details.customer_reference || null,
                order_reference: paymentIntent.payment_details.order_reference || null,
              };
            }
            // attach card-holder name if available
            if (billingDetails && billingDetails.name) {
              update.$set['payment.cardHolderName'] = billingDetails.name;
            } else if (billingFromIntent && billingFromIntent.billing_details && billingFromIntent.billing_details.name) {
              update.$set['payment.cardHolderName'] = billingFromIntent.billing_details.name;
            }

            const updatedOrder = await Order.findByIdAndUpdate(orderId, update, { new: true });
            console.log("Order updated:", updatedOrder._id, "->", newStatus);
          } catch (err) {
            console.error('Error updating order in webhook:', err);
          }
        } else {
          console.warn('No orderId in session metadata; skipping DB update.');
        }
      } 
      else {
        console.log('Unhandled event type:', event.type);
      }
    } catch (err) {
      console.error('Error processing webhook event:', err);
    }
    res.json({ received: true });
  };

