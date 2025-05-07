const asyncHandler = require('express-async-handler');
const Material = require('../models/materialModel');
const User = require('../models/userModel');
const Group = require('../models/groupModel');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/fileUpload');

// @desc    Create a new material
// @route   POST /api/groups/:groupId/materials
// @access  Private/Teacher
const createMaterial = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { title, content, videoUrl } = req.body;
  
  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Ensure the teacher is the owner of the group
  if (group.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to add materials to this group');
  }

  let videoPath = null;
  
  // Handle video file upload if present (Multer middleware sets req.file)
  if (req.file && req.file.fieldname === 'videoFile') {
    videoPath = `/uploads/videos/${req.file.filename}`;
  }

  // Parse code blocks if they were sent as JSON string
  let parsedCodeBlocks = [];
  try {
    if (req.body.codeBlocks) {
      if (typeof req.body.codeBlocks === 'string') {
        parsedCodeBlocks = JSON.parse(req.body.codeBlocks);
      } else if (Array.isArray(req.body.codeBlocks)) {
        parsedCodeBlocks = req.body.codeBlocks;
      }
    }
  } catch (error) {
    console.error('Error parsing code blocks:', error);
  }

  const material = await Material.create({
    title,
    content,
    codeBlocks: parsedCodeBlocks,
    videoUrl,
    videoPath,
    group: groupId,
    createdBy: req.user._id
  });

  res.status(201).json(material);
});

// @desc    Get all materials for a group
// @route   GET /api/groups/:groupId/materials
// @access  Private
const getAllMaterials = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Check if user is in the group or is the teacher
  const isTeacher = group.teacher.toString() === req.user._id.toString();
  const isStudent = group.students.some(student => student.toString() === req.user._id.toString());

  if (!isTeacher && !isStudent) {
    res.status(403);
    throw new Error('Not authorized to view materials for this group');
  }

  const materials = await Material.find({ group: groupId })
    .select('-__v')
    .sort({ createdAt: -1 });

  res.json(materials);
});

// @desc    Get a material by ID
// @route   GET /api/groups/:groupId/materials/:materialId
// @access  Private
const getMaterialById = asyncHandler(async (req, res) => {
  const { groupId, materialId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Check if user is in the group or is the teacher
  const isTeacher = group.teacher.toString() === req.user._id.toString();
  const isStudent = group.students.some(student => student.toString() === req.user._id.toString());

  if (!isTeacher && !isStudent) {
    res.status(403);
    throw new Error('Not authorized to view materials for this group');
  }

  const material = await Material.findOne({ _id: materialId, group: groupId });

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  res.json(material);
});

// @desc    Update a material
// @route   PUT /api/groups/:groupId/materials/:materialId
// @access  Private/Teacher
const updateMaterial = asyncHandler(async (req, res) => {
  const { groupId, materialId } = req.params;
  const { title, content, videoUrl } = req.body;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Ensure the teacher is the owner of the group
  if (group.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update materials in this group');
  }

  // Find the material
  const material = await Material.findOne({ _id: materialId, group: groupId });

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  let videoPath = material.videoPath;
  
  // Handle video file upload if present (Multer middleware sets req.file)
  if (req.file && req.file.fieldname === 'videoFile') {
    // Delete old video if exists
    if (material.videoPath) {
      try {
        const oldFilePath = path.join(__dirname, '../..', material.videoPath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (deleteError) {
        console.error('Error deleting old file:', deleteError);
        // Continue even if old file deletion fails
      }
    }
    
    videoPath = `/uploads/videos/${req.file.filename}`;
  }

  // Parse code blocks if they were sent as JSON string
  let parsedCodeBlocks = material.codeBlocks;
  try {
    if (req.body.codeBlocks) {
      if (typeof req.body.codeBlocks === 'string') {
        parsedCodeBlocks = JSON.parse(req.body.codeBlocks);
      } else if (Array.isArray(req.body.codeBlocks)) {
        parsedCodeBlocks = req.body.codeBlocks;
      }
    }
  } catch (error) {
    console.error('Error parsing code blocks:', error);
  }

  // Update material
  material.title = title || material.title;
  material.content = content || material.content;
  material.codeBlocks = parsedCodeBlocks;
  material.videoUrl = videoUrl !== undefined ? videoUrl : material.videoUrl;
  material.videoPath = videoPath;

  const updatedMaterial = await material.save();

  res.json(updatedMaterial);
});

// @desc    Delete a material
// @route   DELETE /api/groups/:groupId/materials/:materialId
// @access  Private/Teacher
const deleteMaterial = asyncHandler(async (req, res) => {
  const { groupId, materialId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Ensure the teacher is the owner of the group
  if (group.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete materials in this group');
  }

  // Find the material
  const material = await Material.findOne({ _id: materialId, group: groupId });

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  // Delete video file if exists
  if (material.videoPath) {
    const filePath = path.join(__dirname, '../../uploads/videos', path.basename(material.videoPath));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await Material.deleteOne({ _id: materialId });

  res.json({ message: 'Material removed' });
});

// @desc    Mark material as viewed by student
// @route   POST /api/groups/:groupId/materials/:materialId/view
// @access  Private/Student
const markMaterialAsViewed = asyncHandler(async (req, res) => {
  const { groupId, materialId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Check if user is in the group
  const isStudent = group.students.some(student => student.toString() === req.user._id.toString());

  if (!isStudent) {
    res.status(403);
    throw new Error('Not authorized to mark materials as viewed in this group');
  }

  // Find the material
  const material = await Material.findOne({ _id: materialId, group: groupId });

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  // Check if already viewed
  const alreadyViewed = material.viewedBy.some(view => view.userId.toString() === req.user._id.toString());

  if (!alreadyViewed) {
    material.viewedBy.push({
      userId: req.user._id,
      viewedAt: new Date()
    });

    await material.save();
  }

  res.json({ message: 'Material marked as viewed' });
});

// @desc    Get material progress (who viewed it)
// @route   GET /api/groups/:groupId/materials/:materialId/progress
// @access  Private/Teacher
const getMaterialProgress = asyncHandler(async (req, res) => {
  const { groupId, materialId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Ensure the teacher is the owner of the group
  if (group.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view material progress');
  }

  // Find the material
  const material = await Material.findOne({ _id: materialId, group: groupId })
    .populate('viewedBy.userId', 'firstName lastName email grade gradeLetter');

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  // Get all students in the group
  const students = await User.find({ _id: { $in: group.students } })
    .select('firstName lastName email grade gradeLetter');

  // Get students who viewed
  const viewedByStudents = material.viewedBy.map(view => {
    return {
      _id: view.userId._id,
      firstName: view.userId.firstName,
      lastName: view.userId.lastName,
      email: view.userId.email,
      grade: view.userId.grade,
      gradeLetter: view.userId.gradeLetter,
      viewedAt: view.viewedAt
    };
  });

  // Get students who haven't viewed
  const viewedIds = viewedByStudents.map(student => student._id.toString());
  const notViewedStudents = students.filter(student => !viewedIds.includes(student._id.toString()));

  res.json({
    totalStudents: students.length,
    viewedByCount: viewedByStudents.length,
    viewedByStudents,
    notViewedStudents
  });
});

// @desc    Get all materials progress for a group
// @route   GET /api/groups/:groupId/materials/progress
// @access  Private/Teacher
const getAllMaterialsProgress = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Ensure the teacher is the owner of the group
  if (group.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view materials progress');
  }

  // Get all materials for the group
  const materials = await Material.find({ group: groupId });

  // Get all students in the group
  const students = await User.find({ _id: { $in: group.students } })
    .select('firstName lastName email grade gradeLetter');

  // Calculate progress for each material
  const progress = {};
  materials.forEach(material => {
    const viewedCount = material.viewedBy.length;
    progress[material._id] = {
      totalStudents: students.length,
      viewedByCount: viewedCount,
      percentComplete: students.length > 0 ? Math.round((viewedCount / students.length) * 100) : 0
    };
  });

  res.json(progress);
});

module.exports = {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  markMaterialAsViewed,
  getMaterialProgress,
  getAllMaterialsProgress
}; 