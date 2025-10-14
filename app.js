const express=require('express');
require('dotenv').config();
const cors = require('cors');
const app=express();
const cookieParser=require('cookie-parser');
const errorRoute = require('./utils/errorRoutes');
const logger = require('./utils/logger');
const authRouter = require('./routes/authRoutes');
const productRouter=require('./routes/productRoutes');
app.use(logger);
const path = require('path');
const wishlistRouter = require('./routes/wishlistRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const cartRouter = require('./routes/cartRoutes');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.WEB_APP_URL || 'http://localhost:5173',
    credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'mnt/uploads')));
app.use(cookieParser());
app.use('/api/v1/auth',authRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/products',productRouter); 
app.use('/api/v1/cart', cartRouter); 
app.use('/api/v1/payments', paymentRouter);

app.use(errorRoute)
// app.post(
//   '/api/v1/payments/webhook',
//   express.raw({ type: 'application/json' }),
//   paymentController.stripeWebhook
// );
module.exports=app;