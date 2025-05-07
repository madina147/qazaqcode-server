const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create a directory for assignments if it doesn't exist
    const assignmentsDir = path.join(uploadDir, 'assignments');
    if (!fs.existsSync(assignmentsDir)) {
      fs.mkdirSync(assignmentsDir, { recursive: true });
    }
    cb(null, assignmentsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept all file types for now, can be restricted as needed
  cb(null, true);

  // Example of file type restriction
  // const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
  // const ext = path.extname(file.originalname).toLowerCase();
  // const mimetype = allowedTypes.test(file.mimetype);
  
  // if (mimetype && ext) {
  //   return cb(null, true);
  // } else {
  //   cb(new Error('Error: Unsupported file type!'));
  // }
};

// Setup multer with storage and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

module.exports = upload; 