const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Uploads a file to the server's filesystem
 * @param {Object} file - The file object from req.files 
 * @param {String} directory - The directory to upload to (e.g. 'videos', 'images')
 * @returns {String} - The path to the uploaded file
 */
const uploadFile = async (file, directory = 'uploads') => {
  // Create directory if it doesn't exist
  const uploadDir = path.join(__dirname, '../../uploads', directory);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique filename using timestamp and random string
  const timestamp = new Date().getTime();
  const randomString = crypto.randomBytes(8).toString('hex');
  const fileExtension = path.extname(file.name || 'file');
  const fileName = `${timestamp}-${randomString}${fileExtension}`;
  
  const filePath = path.join(uploadDir, fileName);
  
  try {
    // For video files, use streams for better handling of large files
    if (file.mimetype && file.mimetype.startsWith('video/') && file.tempFilePath) {
      // If we have a temp file, use fs.copyFile instead of file.mv
      await fs.promises.copyFile(file.tempFilePath, filePath);
    } else {
      // For other files, use the regular move method
      await file.mv(filePath);
    }
    
    // Return the relative path for storing in the database
    return `/uploads/${directory}/${fileName}`;
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Delete a file from the server's filesystem
 * @param {String} filePath - The relative path of the file
 * @returns {Boolean} - Whether the file was successfully deleted
 */
const deleteFile = (filePath) => {
  try {
    // Handle case where filePath doesn't exist or is null
    if (!filePath) return false;
    
    // Convert relative path to absolute path
    const absolutePath = path.join(__dirname, '../..', filePath);
    
    // Check if file exists
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  uploadFile,
  deleteFile
}; 