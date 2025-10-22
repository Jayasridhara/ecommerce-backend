

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET } = require('../utils/config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
});

// Configure Multer to use Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecommerce-products', // folder name in your Cloudinary account
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }], // optional resize
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
