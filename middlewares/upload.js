const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directory exists
const uploadPath = path.join(__dirname, '../mnt/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + Date.now() + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = allowed.test(file.mimetype);
  const extname = allowed.test(ext);
  if (mimetype && extname) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
