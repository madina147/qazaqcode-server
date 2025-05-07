const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnswerSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  selectedOptionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

const TestResultSchema = new Schema({
  test: {
    type: Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [AnswerSchema],
  score: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  }
});

// Create a compound index to ensure a student can only have one result per test
TestResultSchema.index({ test: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('TestResult', TestResultSchema); 