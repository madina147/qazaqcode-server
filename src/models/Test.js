const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OptionSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

const QuestionSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  options: [OptionSchema]
});

const TestSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 180,
    default: 30
  },
  deadline: {
    type: Date,
    required: true
  },
  questions: [QuestionSchema],
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure each question has at least two options and one correct answer
TestSchema.pre('save', function(next) {
  const test = this;
  
  // Validation for questions and options
  if (test.questions.length === 0) {
    return next(new Error('Test must contain at least one question'));
  }
  
  for (const question of test.questions) {
    // Check if question has at least two options
    if (!question.options || question.options.length < 2) {
      return next(new Error('Each question must have at least two options'));
    }
    
    // Check if question has at least one correct answer
    const hasCorrectAnswer = question.options.some(option => option.isCorrect);
    if (!hasCorrectAnswer) {
      return next(new Error('Each question must have at least one correct answer'));
    }
  }
  
  next();
});

// Проверяем, существует ли уже модель, чтобы избежать повторной компиляции
module.exports = mongoose.models.Test || mongoose.model('Test', TestSchema); 