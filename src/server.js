const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/userModel');

// Routes
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const testRoutes = require('./routes/testRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
// const uploadRoutes = require("./routes/uploadRoutes");

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'https://34.34.73.209', // Vite's default port
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors({
  origin: 'https://34.34.73.209', // Vite's default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Content-Length'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Error handler for multer and other file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      message: 'File upload error: ' + err.message,
      code: err.code
    });
  } else if (err && (err.code === 'ETIMEDOUT' || err.message?.includes('unexpected end'))) {
    console.error('File upload error:', err);
    return res.status(500).json({
      message: 'File upload failed. The connection might have been interrupted or the file is too large.',
      error: err.message
    });
  }
  next(err);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
// app.use("/api/upload", uploadRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/ratings', ratingRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('QazaqCode API is running...');
});

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.user = user;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.firstName} ${socket.user.lastName} (${socket.user._id})`);
  
  // Join the global chat room
  socket.join('global');
  
  // Listen for new messages
  socket.on('sendMessage', async (messageData) => {
    try {
      // Create new message using the controller or directly
      const Message = require('./models/messageModel');
      
      // Detect if message is a question (starts with ❓)
      const messageType = messageData.content.startsWith('❓') ? 'question' : (messageData.type || 'regular');
      
      const message = await Message.create({
        sender: socket.user._id,
        content: messageData.content,
        messageType: messageType
      });
      
      // Populate sender info for the client
      const populatedMessage = await Message.findById(message._id).populate('sender', 'firstName lastName role');
      
      // Broadcast to all clients in the global room
      io.to('global').emit('newMessage', populatedMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });
  
  // Listen for file upload notifications
  socket.on('fileUploaded', async (fileData) => {
    try {
      // Get the message from the database to ensure it exists
      const Message = require('./models/messageModel');
      const message = await Message.findById(fileData.messageId).populate('sender', 'firstName lastName role');
      
      if (message) {
        // Broadcast to all clients in the global room
        io.to('global').emit('newMessage', message);
      }
    } catch (error) {
      console.error('Error handling file upload notification:', error);
      socket.emit('error', 'Failed to notify about file upload');
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.firstName} ${socket.user.lastName}`);
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});