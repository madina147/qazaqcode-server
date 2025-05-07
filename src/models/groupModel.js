const mongoose = require('mongoose');

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      default: 'Python программалау',
      trim: true
    },
    grade: {
      type: String,
      required: function() {
        // Требуем grade только при создании новой группы, но не при обновлении
        return this.isNew;
      },
      trim: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;