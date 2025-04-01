const Group = require('../models/groupModel');
const User = require('../models/userModel');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private/Teacher
const createGroup = async (req, res) => {
  const { name, description } = req.body;

  const group = await Group.create({
    name,
    description,
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
// @route   POST /api/groups/:id/students
// @access  Private/Teacher
const addStudentToGroup = async (req, res) => {
  const { studentId } = req.body;
  const groupId = req.params.id;

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
  if (group.students.includes(studentId)) {
    res.status(400);
    throw new Error('Student already in group');
  }
  
  group.students.push(studentId);
  await group.save();
  
  // Add group to student's groups
  student.groups.push(groupId);
  await student.save();
  
  res.status(200).json(group);
};

// @desc    Remove student from group
// @route   DELETE /api/groups/:id/students/:studentId
// @access  Private/Teacher
const removeStudentFromGroup = async (req, res) => {
  const { studentId } = req.params;
  const groupId = req.params.id;

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
  
  // Remove student from group
  group.students = group.students.filter(
    student => student.toString() !== studentId
  );
  
  await group.save();
  
  // Remove group from student's groups
  const student = await User.findById(studentId);
  if (student) {
    student.groups = student.groups.filter(
      group => group.toString() !== groupId
    );
    await student.save();
  }
  
  res.status(200).json(group);
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
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
  const group = await Group.findById(req.params.id)
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
};

module.exports = {
  createGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  getTeacherGroups,
  getStudentGroups,
  getGroupById
};