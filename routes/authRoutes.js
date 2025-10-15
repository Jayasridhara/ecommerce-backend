const express=require('express');



const { register, login, getMe, logout, updateProfile, forgotPassword, resetPassword, profileDelete } = require('../controller/authController');
const { isAuthenticated } = require('../middlewares/auth');
const authRouter=express.Router();

authRouter.post('/register',register)
authRouter.post('/login',login);
authRouter.get('/getMe',isAuthenticated,getMe);
authRouter.post('/logout',isAuthenticated,logout);
authRouter.put('/profile',isAuthenticated,updateProfile)
authRouter.post('/forgotpassword', forgotPassword);
authRouter.post('/resetpassword/:token', resetPassword);
authRouter.delete('/profile/delete', isAuthenticated,profileDelete);


module.exports=authRouter;  
