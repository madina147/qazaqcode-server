const mongoose = require('mongoose');

const optionSchema = mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false
  }
});

const questionSchema = mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 1
  },
  options: [optionSchema]
});

const testSchema = mongoose.Schema(
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
    timeLimit: {
      type: Number, // in minutes
      required: true,
      default: 30
    },
    deadline: {
      type: Date,
      required: true
    },
    questions: [questionSchema],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Test = mongoose.model('Test', testSchema);

module.exports = Test;