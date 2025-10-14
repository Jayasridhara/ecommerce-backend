// Run with: node scripts\migrateOrders.js
const mongoose = require('mongoose');
const Order = require('../models/order'); // adjust path if needed
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  // Ensure every order has a status and payment object
  const res = await Order.updateMany(
    { $or: [ { status: { $exists: false } }, { status: null } ] },
    { $set: { status: 'pending' } }
  );
  console.log('Status updated:', res.nModified);

  const res2 = await Order.updateMany(
    { $or: [ { payment: { $exists: false } }, { payment: null } ] },
    { $set: { payment: {} } }
  );
  console.log('Payment object ensured:', res2.nModified);

  // Optionally set paidAt for orders where payment.status indicates paid
  // await Order.updateMany(
  //   { 'payment.status': 'paid', paidAt: { $exists: false } },
  //   { $set: { paidAt: new Date() } }
  // );

  await mongoose.disconnect();
  console.log('Migration finished');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});