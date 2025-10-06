//import express module
const express=require('express');
const mongoose=require('mongoose');
const app = require('./app');
const { PORT, MONGODB_URI } = require('./utils/config');

require('dotenv').config();
//create an express apllication
mongoose.connect(MONGODB_URI)
.then(()=>{
    console.log("connect to MongoDB");
    app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:5000`)
});


})
.catch((err)=>console.log("could not connext"))