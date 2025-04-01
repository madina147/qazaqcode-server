const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a new student
// @route   POST /api/users/register/student
// @access  Public
const registerStudent = async (req, res) => {
  const { firstName, lastName, middleName, grade, gradeLetter, login, password } = req.body;

  const userExists = await User.findOne({ login });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    firstName,
    lastName,
    middleName,
    grade,
    gradeLetter,
    login,
    password,
    role: 'student'
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

// @desc    Register a new teacher
// @route   POST /api/users/register/teacher
// @access  Public
const registerTeacher = async (req, res) => {
  const { firstName, lastName, middleName, workplace, phoneNumber, login, password } = req.body;

  const userExists = await User.findOne({ login });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    firstName,
    lastName,
    middleName,
    workplace,
    phoneNumber,
    login,
    password,
    role: 'teacher'
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid login or password');
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      login: user.login,
      role: user.role,
      ...(user.role === 'student' && {
        grade: user.grade,
        gradeLetter: user.gradeLetter,
      }),
      ...(user.role === 'teacher' && {
        workplace: user.workplace,
        phoneNumber: user.phoneNumber,
      }),
      points: user.points,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.middleName = req.body.middleName || user.middleName;
    
    if (user.role === 'student') {
      user.grade = req.body.grade || user.grade;
      user.gradeLetter = req.body.gradeLetter || user.gradeLetter;
    }
    
    if (user.role === 'teacher') {
      user.workplace = req.body.workplace || user.workplace;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    }
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      middleName: updatedUser.middleName,
      login: updatedUser.login,
      role: updatedUser.role,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  // In a real application, you would generate a token and send an email
  // For demo purposes, we'll just return success
  
  const { login } = req.body;
  
  const user = await User.findOne({ login });
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  res.status(200).json({ message: 'Password reset email sent' });
};

// @desc    Get all students (for teachers)
// @route   GET /api/users/students
// @access  Private/Teacher
const getStudents = async (req, res) => {
  const students = await User.find({ role: 'student' }).select('-password');
  res.json(students);
};

module.exports = {
  registerStudent,
  registerTeacher,
  authUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  getStudents
};