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
app.use(express.json());

app.use(cors({
    origin: process.env.WEB_APP_URL,
    credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'mnt/uploads')));
app.use(cookieParser());
app.use('/api/v1/auth',authRouter);
app.use('/api/v1/products',productRouter);
app.use(errorRoute)

module.exports=app;