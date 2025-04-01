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

module.exports = {
  sendMessage,
  getMessages,
  blockMessage
};