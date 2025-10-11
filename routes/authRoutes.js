const express=require('express');


const User = require('../models/User');
const { register, login, getMe, logout, updateProfile, forgotPassword, resetPassword, cartItemsList } = require('../controller/authController');
const { isAuthenticated } = require('../middlewares/auth');
const Product = require('../models/Product');
const authRouter=express.Router();

authRouter.post('/register',register)
authRouter.post('/login',login);
authRouter.get('/getMe',isAuthenticated,getMe);
authRouter.post('/logout',isAuthenticated,logout);
authRouter.put('/profile',isAuthenticated,updateProfile)
authRouter.post('/forgotpassword', forgotPassword);
authRouter.post('/resetpassword/:token', resetPassword);

authRouter.post("/cart/update",isAuthenticated,cartItemsList);

module.exports=authRouter;  
