const Group = require('../models/groupModel');
const User = require('../models/userModel');
const Assignment = require('../models/assignmentModel');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private/Teacher
const createGroup = async (req, res) => {
  const { name, description, subject, grade } = req.body;

  const group = await Group.create({
    name,
    description,
    subject: subject || 'Python программалау', // Default to Python if not provided
    grade,
    teacher: req.user._id,
    students: []
  });

  if (group) {
    res.status(201).json(group);
  } else {
    res.status(400);
    throw new Error('Invalid group data');
  }
};

// @desc    Add student to group
// @route   POST /api/groups/:groupId/students
// @access  Private/Teacher
const addStudentToGroup = async (req, res) => {
  try {
    const { studentId } = req.body;
    const groupId = req.params.groupId;

    // Валидация studentId
    if (!studentId || studentId === 'undefined') {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    
    // Проверка на валидный MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(studentId);
    if (!isValidObjectId) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const group = await Group.findById(groupId);
    
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
    
    // Check if teacher owns this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to manage this group');
    }
    
    const student = await User.findById(studentId);
    
    if (!student || student.role !== 'student') {
      res.status(404);
      throw new Error('Student not found');
    }
    
    // Check if student already in group
    if (group.students.some(existingStudent => existingStudent.toString() === studentId)) {
      return res.status(400).json({ message: 'Student already in group' });
    }
    
    // Добавляем студента в группу, используя обновление через findByIdAndUpdate
    // Это позволяет избежать валидации всей модели при сохранении
    await Group.findByIdAndUpdate(
      groupId,
      { $push: { students: studentId } },
      { new: true }
    );
    
    // Add group to student's groups
    if (!student.groups) {
      student.groups = [];
    }
    student.groups.push(groupId);
    await student.save();
    
    // Получаем обновленную группу для ответа
    const updatedGroup = await Group.findById(groupId)
      .populate('teacher', 'firstName lastName')
      .populate('students', 'firstName lastName grade gradeLetter points');
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error adding student to group'
    });
  }
};

// @desc    Remove student from group
// @route   DELETE /api/groups/:groupId/students/:studentId
// @access  Private/Teacher
const removeStudentFromGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const studentId = req.params.studentId;
    
    // Валидация studentId
    if (!studentId || studentId === 'undefined') {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    
    // Проверка на валидный MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(studentId);
    if (!isValidObjectId) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const group = await Group.findById(groupId);
    
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
    
    // Check if teacher owns this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to manage this group');
    }
    
    const student = await User.findById(studentId);
    
    if (!student || student.role !== 'student') {
      res.status(404);
      throw new Error('Student not found');
    }
    
    // Check if student is in group
    if (!group.students.some(existingStudent => existingStudent.toString() === studentId)) {
      res.status(400);
      throw new Error('Student not in group');
    }
    
    // Удаляем студента из группы, используя обновление через findByIdAndUpdate
    await Group.findByIdAndUpdate(
      groupId,
      { $pull: { students: studentId } },
      { new: true }
    );
    
    // Remove group from student's groups
    if (student.groups) {
      student.groups = student.groups.filter(id => id.toString() !== groupId.toString());
      await student.save();
    }
    
    // Получаем обновленную группу для ответа
    const updatedGroup = await Group.findById(groupId)
      .populate('teacher', 'firstName lastName')
      .populate('students', 'firstName lastName grade gradeLetter points');
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error removing student from group'
    });
  }
};

// @desc    Get all groups for a teacher
// @route   GET /api/groups
// @access  Private/Teacher
const getTeacherGroups = async (req, res) => {
  const groups = await Group.find({ teacher: req.user._id })
    .populate('students', 'firstName lastName grade gradeLetter points');
  
  res.json(groups);
};

// @desc    Get all groups for a student
// @route   GET /api/groups/student
// @access  Private/Student
const getStudentGroups = async (req, res) => {
  const student = await User.findById(req.user._id)
    .populate({
      path: 'groups',
      populate: {
        path: 'teacher',
        select: 'firstName lastName'
      }
    });
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  
  res.json(student.groups);
};

// @desc    Get a specific group
// @route   GET /api/groups/:groupId
// @access  Private
const getGroupById = async (req, res) => {
  try {
    const id = req.params.groupId;
    
    // Проверка валидности ID
    if (!id || id === 'undefined') {
      res.status(400);
      throw new Error('Invalid group ID');
    }
    
    const group = await Group.findById(id)
      .populate('teacher', 'firstName lastName')
      .populate('students', 'firstName lastName grade gradeLetter points');
    
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
    
    // Check if user is teacher of group or a student in group
    const isTeacher = group.teacher._id.toString() === req.user._id.toString();
    const isStudent = group.students.some(
      student => student._id.toString() === req.user._id.toString()
    );
    
    if (!isTeacher && !isStudent) {
      res.status(401);
      throw new Error('Not authorized to view this group');
    }
    
    res.json(group);
  } catch (error) {
    // Если это ошибка валидации MongoDB ID
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      res.status(400);
      throw new Error('Invalid group ID format');
    }
    
    // Пробросить другие ошибки
    throw error;
  }
};

// @desc    Create an assignment for a group
// @route   POST /api/groups/:groupId/assignments
// @access  Private/Teacher
const createAssignment = async (req, res) => {
  const groupId = req.params.groupId;
  const { title, description, deadline } = req.body;
  
  try {
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
    
    // Verify teacher owns this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to create assignments for this group');
    }
    
    // Process file uploads if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path
      }));
    }
    
    // Create the assignment
    const assignment = await Assignment.create({
      title,
      description,
      deadline,
      attachments,
      group: groupId,
      createdBy: req.user._id
    });
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error creating assignment');
  }
};

// @desc    Get all assignments for a group
// @route   GET /api/groups/:groupId/assignments
// @access  Private
const getGroupAssignments = async (req, res) => {
  const groupId = req.params.groupId;
  
  try {
    console.log(`Fetching assignments for group ID: ${groupId}`);
    
    // Проверка валидности ID
    if (!groupId || groupId === 'undefined') {
      console.log('Invalid group ID provided');
      return res.status(400).json({ message: 'Invalid group ID' });
    }
    
    // Проверка на валидный MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(groupId);
    if (!isValidObjectId) {
      console.log('Invalid MongoDB ObjectId format');
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`Group not found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Verify user has access to group (teacher or student in group)
    const isTeacher = group.teacher.toString() === req.user._id.toString();
    const isStudent = group.students.some(
      student => student.toString() === req.user._id.toString()
    );
    
    console.log(`User access check: isTeacher=${isTeacher}, isStudent=${isStudent}`);
    
    if (!isTeacher && !isStudent) {
      console.log(`User ${req.user._id} not authorized to view assignments for group ${groupId}`);
      return res.status(403).json({ message: 'Not authorized to view assignments for this group' });
    }
    
    // Get assignments for the group
    console.log(`Fetching assignments from database for group: ${groupId}`);
    const assignments = await Assignment.find({ group: groupId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');
    
    console.log(`Found ${assignments.length} assignments for group ${groupId}`);
    return res.json(assignments);
  } catch (error) {
    console.error(`Error in getGroupAssignments: ${error.message}`);
    console.error(error.stack);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid group ID format',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    return res.status(500).json({
      message: error.message || 'Error fetching assignments',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:groupId
// @access  Private/Teacher
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Валидация groupId
    if (!groupId || groupId === 'undefined') {
      return res.status(400).json({ message: 'Invalid group ID' });
    }
    
    // Проверка на валидный MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(groupId);
    if (!isValidObjectId) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const group = await Group.findById(groupId);
    
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }
    
    // Проверка прав - удалять может только создатель группы (учитель)
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to delete this group');
    }
    
    // Удаляем группу из списка групп всех студентов
    const updatePromises = group.students.map(studentId => 
      User.updateOne(
        { _id: studentId },
        { $pull: { groups: groupId } }
      )
    );
    
    // Ждем обновления всех студентов
    await Promise.all(updatePromises);
    
    // Удаляем саму группу
    await Group.deleteOne({ _id: groupId });
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error deleting group'
    });
  }
};

// @desc    Get assignments for a group (No Auth Check - Debug Only)
// @access  Public
const getAssignmentsNoAuth = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Базовые проверки валидности
    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid group ID. Expected a string',
        success: false
      });
    }
    
    // Проверка формата ID
    if (!/^[0-9a-fA-F]{24}$/.test(groupId)) {
      return res.status(400).json({ 
        message: 'Invalid group ID format. Must be a valid MongoDB ObjectId',
        success: false
      });
    }
    
    // Проверяем существование группы, но не проверяем права доступа
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        message: 'Group not found',
        success: false 
      });
    }
    
    // Ищем задания для группы
    console.log(`Fetching assignments (no auth) for group: ${groupId}`);
    const assignments = await Assignment.find({ group: groupId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');
    
    console.log(`Found ${assignments.length} assignments for group ${groupId}`);
    
    return res.json({
      assignments,
      count: assignments.length,
      success: true
    });
  } catch (error) {
    console.error(`Error in getAssignmentsNoAuth: ${error.message}`);
    console.error(error.stack);
    
    return res.status(500).json({
      message: 'Internal server error fetching assignments',
      error: error.message,
      success: false
    });
  }
};

// @desc    Get assignment by ID from a group (no auth required)
// @route   GET /api/groups/:groupId/assignments/:assignmentId
// @access  Public
const getAssignmentByIdNoAuth = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const assignmentId = req.params.assignmentId;
    
    console.log(`Fetching assignment ${assignmentId} from group ${groupId}`);
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Топ табылмады' });
    }
    
    // Find the specific assignment in the group
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      group: groupId
    }).populate('createdBy', 'firstName lastName');
    
    if (!assignment) {
      return res.status(404).json({ message: 'Тапсырма табылмады' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error(`Error in getAssignmentByIdNoAuth: ${error.message}`);
    res.status(500).json({ message: 'Тапсырманы жүктеу кезінде қате пайда болды' });
  }
};

module.exports = {
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
};