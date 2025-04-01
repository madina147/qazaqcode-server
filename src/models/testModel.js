const mongoose = require('mongoose');

const testSchema = mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true
    },
    questions: [
      {
        question: {
          type: String,
          required: true
        },
        options: [
          {
            text: String,
            isCorrect: Boolean
          }
        ]
      }
    ],
    passingScore: {
      type: Number,
      default: 70 // Percentage required to pass
    }
  },
  {
    timestamps: true
  }
);

const Test = mongoose.model('Test', testSchema);

module.exports = Test;