// Configuration file for the QazaqCode server
// This file contains various configuration settings used across the application

const dotenv = require('dotenv');
dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  
  // AI evaluation configuration
  ai: {
    apiKey: process.env.GOOGLE_AI_API_KEY || "AIzaSyCSdfmxdInQwvA-gNWNnn6aT3dKWqCwzOg",
    model: process.env.AI_MODEL || "gemini-1.5-flash-latest",
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
    evaluationEnabled: process.env.AI_EVALUATION_ENABLED !== 'false',
    defaultTimeout: parseInt(process.env.AI_TIMEOUT || "30000"),
    endpoint: process.env.AI_ENDPOINT || '',
    feedbackPrompt: 'Оцени следующее решение:',
    defaultErrorScore: parseInt(process.env.AI_DEFAULT_ERROR_SCORE || "50"),
  },
  
  // Database configuration
  db: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/qazaqcode',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 5000
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'qazaqcode_secret_key',
    expiresIn: '7d'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CLIENT_URL || 'http://34.34.73.209',
    credentials: true
  },
  
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@qazaqcode.kz',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Google Cloud Storage config for file uploads
  gcs: {
    projectId: process.env.GCS_PROJECT_ID,
    bucketName: process.env.GCS_BUCKET_NAME,
    keyFilename: process.env.GCS_KEY_FILENAME,
  },
};

module.exports = config; 