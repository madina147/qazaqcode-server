const express = require('express');
const {
  getAssignment,
  submitSolution,
  getAssignmentSubmissions,
  getMySubmission,
  evaluateSubmission
} = require('../controllers/submissionController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerMiddleware');

const router = express.Router();

// Get a single assignment by ID
router.route('/:id')
  .get(protect, getAssignment);

// Submit solution for an assignment
router.route('/:id/submit')
  .post(protect, upload.array('attachments'), submitSolution);

// Get all submissions for an assignment (teacher only)
router.route('/:id/submissions')
  .get(protect, admin, getAssignmentSubmissions);

// Get student's own submission
router.route('/:id/my-submission')
  .get(protect, getMySubmission);

// Teacher evaluates a submission
router.route('/submissions/:id/evaluate')
  .put(protect, admin, evaluateSubmission);

module.exports = router; 