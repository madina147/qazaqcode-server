const express = require('express');
const {
  createTest,
  getTestByLessonId,
  submitTest
} = require('../controllers/testController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, admin, createTest);

router.route('/lesson/:lessonId')
  .get(protect, getTestByLessonId);

router.post('/:id/submit', protect, submitTest);

module.exports = router;