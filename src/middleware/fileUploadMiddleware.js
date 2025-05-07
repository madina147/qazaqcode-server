const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create directories for specific file types
const videosDir = path.join(uploadDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

const documentsDir = path.join(uploadDir, 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure express-fileupload middleware
const fileUploadMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  debug: process.env.NODE_ENV !== 'production',
  abortOnLimit: false,
  preserveExtension: true,
  safeFileNames: true,
  parseNested: true,
  uploadTimeout: 120000, // 2 minutes
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  },
});

module.exports = fileUploadMiddleware; 