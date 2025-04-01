const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    middleName: {
      type: String,
      trim: true
    },
    login: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'teacher'],
      default: 'student'
    },
    // Student specific fields
    grade: {
      type: Number,
      min: 7,
      max: 11,
      required: function() { return this.role === 'student' }
    },
    gradeLetter: {
      type: String,
      required: function() { return this.role === 'student' }
    },
    // Teacher specific fields
    workplace: {
      type: String,
      required: function() { return this.role === 'teacher' }
    },
    phoneNumber: {
      type: String,
      required: function() { return this.role === 'teacher' }
    },
    // Common fields
    points: {
      type: Number,
      default: 0
    },
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }]
  },
  {
    timestamps: true
  }
);

// Unique ID generation for students
userSchema.pre('save', async function(next) {
  if (this.isNew && this.role === 'student') {
    this._id = new mongoose.Types.ObjectId();
  }
  next();
});

// Password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password comparison method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;