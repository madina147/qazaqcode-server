const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  sendMessage,
  getMessages,
  blockMessage,
  uploadFile
} = require('../controllers/messageController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with username prefix
    const username = req.user ? `${req.user.firstName}_${req.user.lastName}` : 'user';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    cb(null, `${cleanUsername}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter to allow only Python files
const fileFilter = (req, file, cb) => {
  if (file.originalname.endsWith('.py')) {
    cb(null, true);
  } else {
    cb(new Error('Only Python (.py) files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1 MB
  }
});

const router = express.Router();

router.route('/')
  .post(protect, sendMessage)
  .get(protect, getMessages);

router.put('/:id/block', protect, admin, blockMessage);

// File upload route
router.post('/upload', protect, upload.single('file'), uploadFile);

module.exports = router;