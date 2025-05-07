const mongoose = require('mongoose');

const attachmentSchema = mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  }
});

const assignmentSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    deadline: {
      type: Date,
      required: true
    },
    attachments: [attachmentSchema],
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submissions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    }]
  },
  {
    timestamps: true
  }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment; 