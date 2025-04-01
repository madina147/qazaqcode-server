const express = require('express');
const {
  registerStudent,
  registerTeacher,
  authUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  getStudents
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register/student', registerStudent);
router.post('/register/teacher', registerTeacher);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.get('/students', protect, admin, getStudents);

module.exports = router;