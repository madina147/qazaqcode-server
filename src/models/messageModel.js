const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: function() {
        return !this.isFile; // Content is required unless it's a file
      },
      trim: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    // New fields for file attachments
    isFile: {
      type: Boolean,
      default: false
    },
    fileUrl: {
      type: String,
      trim: true
    },
    fileName: {
      type: String,
      trim: true
    },
    // For message categorization (question, answer, code, etc.)
    messageType: {
      type: String,
      enum: ['regular', 'question', 'answer', 'code', 'file'],
      default: 'regular'
    }
  },
  {
    timestamps: true
  }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;