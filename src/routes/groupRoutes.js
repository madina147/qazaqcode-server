const express = require('express');
const {
  createGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  getTeacherGroups,
  getStudentGroups,
  getGroupById
} = require('../controllers/groupController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, admin, createGroup)
  .get(protect, admin, getTeacherGroups);

router.get('/student', protect, getStudentGroups);
router.route('/:id')
  .get(protect, getGroupById);
router.route('/:id/students')
  .post(protect, admin, addStudentToGroup);
router.route('/:id/students/:studentId')
  .delete(protect, admin, removeStudentFromGroup);

module.exports = router;