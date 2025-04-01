const express = require('express');
const {
  createLesson,
  getLessons,
  getLessonById,
  completeLesson
} = require('../controllers/lessonController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, admin, createLesson)
  .get(protect, getLessons);

router.route('/:id')
  .get(protect, getLessonById);

router.post('/:id/complete', protect, completeLesson);

module.exports = router;