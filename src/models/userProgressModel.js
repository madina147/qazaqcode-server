const mongoose = require('mongoose');

const userProgressSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    passedTests: [{
      test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
      },
      score: Number,
      passedAt: {
        type: Date,
        default: Date.now
      }
    }],
    solvedTasks: [{
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      },
      solution: String,
      timeSpent: Number, // in seconds
      solvedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = UserProgress;