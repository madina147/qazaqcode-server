const mongoose = require('mongoose');

const submissionSchema = mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    solution: {
      type: String,
      required: true
    },
    attachments: [{
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
    }],
    aiEvaluation: {
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      feedback: String,
      evaluatedAt: Date
    },
    teacherEvaluation: {
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      feedback: String,
      evaluatedAt: Date
    },
    status: {
      type: String,
      enum: ['submitted', 'ai_evaluated', 'teacher_evaluated', 'pending_teacher_review'],
      default: 'submitted'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create a compound index to ensure a student can only have one submission per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission; 