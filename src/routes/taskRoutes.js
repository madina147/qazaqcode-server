const express = require('express');
const {
  createTask,
  getTasksByTestId,
  getTaskById,
  submitSolution
} = require('../controllers/taskController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, admin, createTask);

router.route('/test/:testId')
  .get(protect, getTasksByTestId);

router.route('/:id')
  .get(protect, getTaskById);

router.post('/:id/submit', protect, submitSolution);

module.exports = router;