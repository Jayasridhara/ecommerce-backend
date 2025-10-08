
const bcrypt=require('bcrypt');
const crypto = require('crypto'); // Built-in Node.js module
const sendEmail=require('../utils/email')
const jwt=require('jsonwebtoken');
const { JWT_SECRET, NODE_ENV } = require('../utils/config');
const User = require('../models/User');


const register=async (req,res)=>{
    try{
        const {name,email,password}=req.body;
        const existingUser=await User.find({email});
        if(existingUser.length>0){
            return res.status(400).json({
                message:'User already exists'
            })
        }
        //hash password
        const hashedPassword=await bcrypt.hash(password,10);
        //create a new user Object
        const newUser=new User({
            name,
            email,
            password:hashedPassword
        });
        //save user to database
       const savedUser=await newUser.save();

        if(!savedUser){
            return res.status(500).json({message:'Failed to regsiter user'})
        }
        //send email
    //    await sendEmail({
    //         email,
    //         subject: 'Welcome to Shop Ease',
    //         message: `<p>Hello ${name},</p><p>Welcome to Shop Ease! We're glad to have you on board.</p><p>Best regards,<br/>Shop Ease Team</p>`
    //         });
            res.status(201).json({
              message:'User register successfully'
        })
    }
    catch(error){
        console.log("error",error)
        res.status(500).json({
            message:'Server error'
        })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // check if the user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User does not exists' });
        }

        // compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // set the token in the response header for httpOnly cookie
        res.cookie('token', token, {
            httpOnly: NODE_ENV === 'production',
            secure: NODE_ENV === 'production',
            sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(200).json({
            message: 'Login successful',
            user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePicture: user.profilePicture, resume: user.resume }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    console.log(email)
    try {
        const user = await User.findOne({ email :email });
        console.log("user",user)
        if (!user) {
          return res.status(404).json({
        success: false,
        message: "User not found in database. Please register first.",
      });
        } 

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save(); // Save the token and expiry to the user

        // Create reset URL
        const resetUrl = `${process.env.WEB_APP_URL}/reset-password/${resetToken}`;
        console.log(user);
        console.log(resetUrl,"resetUrl")
        const message = `
            <h1>You have requested a password reset</h1>
            <p>Please go to this link to reset your password:</p>
            <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
            <p>This link will expire in 1 hour.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message,
            });

            res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent. Check spam mail if it is not received' });
        } catch (error) {
            console.log(error);
            // If email fails, clear the token to prevent a broken link
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' + error});
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset user password
// @route   POST /api/auth/resetpassword/:token
// @access  Public
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
   
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
        });
      
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
        }

        // Update password
        user.password = password;
        user.resetPasswordToken = undefined; // Clear the token
        user.resetPasswordExpires = undefined; // Clear expiry
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful. You can now login with your new password.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getMe = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId).select('-password').populate('role', 'name');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' +error.message});
    }
}

const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            secure: NODE_ENV === 'production',
            sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
        });

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}
const updateProfile=async (req,res)=>{
        try{
            const userId=req.userId;
            const updates=req.body;
            delete updates.email;
            delete updates.password;
            delete updates.role;
            const user=await User.findByIdAndUpdate(userId,updates,{new:true}).select('-password');
            if(!user){
                return res.status(404).json({message:'User not found'})
            }
            res.status(200).json({message:'Profile updated successfully',user})
        }
        catch(error){
            res.status(500).json({message:'Server error'})

        }
}

module.exports={
    register,
    login,
    getMe,
    logout,
    updateProfile,
    forgotPassword,
    resetPassword
}