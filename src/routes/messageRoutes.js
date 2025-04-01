const express = require('express');
const {
  sendMessage,
  getMessages,
  blockMessage
} = require('../controllers/messageController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, sendMessage)
  .get(protect, getMessages);

router.put('/:id/block', protect, admin, blockMessage);

module.exports = router;