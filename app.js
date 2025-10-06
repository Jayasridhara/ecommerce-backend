const express=require('express');
require('dotenv').config();
const cors = require('cors');
const app=express();
const cookieParser=require('cookie-parser');
const errorRoute = require('./utils/errorRoutes');
const logger = require('./utils/logger');
const authRouter = require('./routes/authRoutes');

app.use(logger);

app.use(express.json());

app.use(cors({
    origin: process.env.WEB_APP_URL,
    credentials: true
}));

app.use(cookieParser());
app.use('/api/v1/auth',authRouter);


app.use(errorRoute)

module.exports=app;