const Message = require('../models/messageModel');
const User = require('../models/userModel');

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const { content } = req.body;

  const message = await Message.create({
    sender: req.user._id,
    content
  });

  if (message) {
    const populatedMessage = await Message.findById(message._id).populate('sender', 'firstName lastName role');
    res.status(201).json(populatedMessage);
  } else {
    res.status(400);
    throw new Error('Invalid message data');
  }
};

// @desc    Get recent messages
// @route   GET /api/messages
// @access  Private
const getMessages = async (req, res) => {
  const messages = await Message.find({ isBlocked: false })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('sender', 'firstName lastName role');
  
  res.json(messages.reverse());
};

// @desc    Block a message (teacher only)
// @route   PUT /api/messages/:id/block
// @access  Private/Teacher
const blockMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);
  
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }
  
  message.isBlocked = true;
  await message.save();
  
  res.json({ message: 'Message blocked' });
};

// @desc    Upload a Python file
// @route   POST /api/messages/upload
// @access  Private
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Create a message with file information
    const message = await Message.create({
      sender: req.user._id,
      content: `Shared a Python file: ${req.file.originalname}`,
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      isFile: true
    });
    
    const populatedMessage = await Message.findById(message._id).populate('sender', 'firstName lastName role');
    
    // Notify socket.io users if needed
    // This is handled in the socket.io connection event in server.js
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  blockMessage,
  uploadFile
};