const express=require('express');



const { register, login, getMe, logout, updateProfile, forgotPassword, resetPassword } = require('../controller/authController');
const { isAuthenticated } = require('../middlewares/auth');
const authRouter=express.Router();

authRouter.post('/register',register)
authRouter.post('/login',login);
authRouter.get('/getMe',isAuthenticated,getMe);
authRouter.post('/logout',isAuthenticated,logout);
authRouter.put('/profile',isAuthenticated,updateProfile)
authRouter.post('/forgotpassword', forgotPassword);
authRouter.post('/resetpassword/:token', resetPassword);



module.exports=authRouter;  
