require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_USER = process.env.EMAIL_USER;
const SENDGRID_API_KEY= process.env.SENDGRID_API_KEY;
module.exports = {
    MONGODB_URI,
    PORT,
    JWT_SECRET,
    NODE_ENV,
    EMAIL_PASS,
    EMAIL_USER,
    SENDGRID_API_KEY

}