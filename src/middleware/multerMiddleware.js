const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create necessary directories
const uploadsDir = path.join(__dirname, '../../uploads');
const videosDir = path.join(uploadsDir, 'videos');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, videosDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Determine the destination directory based on file type
    let uploadDir = uploadsDir;
    
    if (file.fieldname === 'videoFile') {
      uploadDir = videosDir;
    } else if (file.mimetype.includes('application/')) {
      uploadDir = documentsDir;
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename to prevent collisions
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname) || '';
    
    cb(null, `${timestamp}-${randomString}${extension}`);
  }
});

// Configure file filter to control which files are accepted
const fileFilter = (req, file, cb) => {
  // Accept all files for now, but you can add restrictions if needed
  if (file.fieldname === 'videoFile' && !file.mimetype.startsWith('video/')) {
    return cb(new Error('Only video files are allowed for videoFile field'), false);
  }
  
  cb(null, true);
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB file size limit
  }
});

module.exports = upload; 