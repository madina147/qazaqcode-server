const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },
    pointsReward: {
      type: Number,
      required: true,
      default: 10
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true
    },
    testCases: [
      {
        input: String,
        expectedOutput: String
      }
    ],
    hints: [String],
    solutionTemplate: {
      type: String,
      default: '# Write your solution here\n\n'
    }
  },
  {
    timestamps: true
  }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;