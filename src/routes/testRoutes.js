const express = require('express');
const {
  createTest,
  getTestById,
  updateTest,
  deleteTest,
  submitTest,
  getGroupTests,
  getTestResults,
  getAllStudentResults
} = require('../controllers/testController');
const { protect, admin, authorize } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// All routes include the groupId from parent router

router.route('/')
  .post(protect, authorize(['teacher']), createTest)
  .get(protect, getGroupTests);

router.route('/:testId')
  .get(protect, getTestById)
  .put(protect, authorize(['teacher']), updateTest)
  .delete(protect, authorize(['teacher']), deleteTest);

router.route('/:testId/submit')
  .post(protect, authorize(['student']), submitTest);

router.route('/:testId/results')
  .get(protect, getTestResults);

router.route('/:testId/results/all')
  .get(protect, authorize(['teacher']), getAllStudentResults);

module.exports = router;