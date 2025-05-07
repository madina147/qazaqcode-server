const express = require('express');
const {
  createGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  getTeacherGroups,
  getStudentGroups,
  getGroupById,
  createAssignment,
  getGroupAssignments,
  deleteGroup,
  getAssignmentsNoAuth,
  getAssignmentByIdNoAuth
} = require('../controllers/groupController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerMiddleware');
const mongoose = require('mongoose');
const Group = require('../models/groupModel');
const Assignment = require('../models/assignmentModel');

// Import test routes
const testRoutes = require('./testRoutes');

// Import material controller functions
const {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  markMaterialAsViewed,
} = require('../controllers/materialController');

const router = express.Router();

// Mount test routes
router.use('/:groupId/tests', testRoutes);

router.route('/')
  .post(protect, admin, createGroup)
  .get(protect, admin, getTeacherGroups);

router.get('/student', protect, getStudentGroups);
router.route('/:groupId')
  .get(protect, getGroupById)
  .delete(protect, admin, deleteGroup);
router.route('/:groupId/students')
  .post(protect, admin, addStudentToGroup);
router.route('/:groupId/students/:studentId')
  .delete(protect, admin, removeStudentFromGroup);

// Assignment routes
router.route('/:groupId/assignments')
  .post(protect, admin, upload.array('attachments'), createAssignment)
  .get(protect, getGroupAssignments);

// Публичный маршрут для заданий (без проверки авторизации)
router.get('/:groupId/assignments-public', getAssignmentsNoAuth);

// Public route for single assignment (no auth required)
router.get('/:groupId/assignments/:assignmentId', getAssignmentByIdNoAuth);

// Public route to get a student's submission for an assignment
router.get('/:groupId/assignments/:assignmentId/my-submission', protect, async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    
    // Find submission for this student and assignment
    const Submission = require('../models/submissionModel');
    const submission = await Submission.findOne({
      assignment: assignmentId,
      student: req.user._id
    });
    
    if (!submission) {
      return res.status(404).json({ message: 'Шешім табылмады' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error getting submission:', error);
    res.status(500).json({ message: 'Шешімді жүктеу кезінде қате пайда болды' });
  }
});

// Route for submitting solutions through the group endpoint
router.post('/:groupId/assignments/:assignmentId/submit', protect, upload.array('attachments'), async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const { solution } = req.body;
    
    // Import the submission controller
    const { submitSolution } = require('../controllers/submissionController');
    
    // Add assignment ID to request params
    req.params.id = assignmentId;
    
    // Call the original handler
    return submitSolution(req, res);
  } catch (error) {
    console.error('Error submitting solution through group endpoint:', error);
    res.status(500).json({ message: 'Шешімді жіберу кезінде қате пайда болды' });
  }
});

// Дополнительный маршрут для отладки с минимальной проверкой
router.get('/:groupId/assignments-debug', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    console.log(`DEBUG: Fetching assignments for group ID: ${groupId}`);
    
    // Проверяем, что ID валидный
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ 
        message: 'Invalid group ID format',
        debug: true,
        success: false
      });
    }
    
    // Проверяем существование группы (без проверки доступа)
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        message: 'Group not found',
        debug: true,
        success: false
      });
    }
    
    // Получаем все задания для группы
    console.log(`DEBUG: Finding assignments for group: ${groupId}`);
    const assignments = await Assignment.find({ group: groupId })
      .sort({ createdAt: -1 });
    
    console.log(`DEBUG: Found ${assignments.length} assignments`);
    return res.json({
      assignments,
      count: assignments.length,
      debug: true,
      success: true
    });
  } catch (error) {
    console.error('DEBUG route error:', error);
    return res.status(500).json({
      message: error.message,
      stack: error.stack,
      debug: true,
      success: false,
      errorType: error.name,
      errorCode: error.code
    });
  }
});

// Material routes
router.route('/:groupId/materials')
  .post(protect, admin, upload.single('videoFile'), createMaterial)
  .get(protect, getAllMaterials);

router.route('/:groupId/materials/:materialId')
  .get(protect, getMaterialById)
  .put(protect, admin, upload.single('videoFile'), updateMaterial)
  .delete(protect, admin, deleteMaterial);

router.route('/:groupId/materials/:materialId/view')
  .post(protect, markMaterialAsViewed);

module.exports = router;