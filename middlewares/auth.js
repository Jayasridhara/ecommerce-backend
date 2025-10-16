const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/config');
const User = require('../models/User');



const isAuthenticated = async (req, res, next) => {
    // get the toke from the cookies
    const token = req.cookies && req.cookies.token;
    
    // if no token, return 401
    if (!token) {
        return res.status(401).json({ message: 'user not authenticated' });
    }

    try {
        // verify the token
        const decoded = jwt.verify(token,JWT_SECRET);
        req.user= decoded;

        // call the next middleware
        next();
    } catch (error) {
        res.status(401).json({ message: 'invalid token' });
    }
}

const allowUsers = (roles) => {
    return async (req, res, next) => {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(401).json({ message: 'user not found' });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({ message: 'access denied' });
        }

        // attach user to request for further use
        req.user = user;

        // proceed to next middleware
        next();
    }
}
module.exports = {
    isAuthenticated,
    allowUsers
};