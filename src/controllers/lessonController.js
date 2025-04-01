const Lesson = require('../models/lessonModel');
const UserProgress = require('../models/userProgressModel');

// @desc    Create a new lesson (teacher only)
// @route   POST /api/lessons
// @access  Private/Teacher
const createLesson = async (req, res) => {
  const { title, content, order } = req.body;

  const lesson = await Lesson.create({
    title,
    content,
    order
  });

  if (lesson) {
    res.status(201).json(lesson);
  } else {
    res.status(400);
    throw new Error('Invalid lesson data');
  }
};

// @desc    Get all lessons
// @route   GET /api/lessons
// @access  Private
const getLessons = async (req, res) => {
  const lessons = await Lesson.find({}).sort({ order: 1 });
  
  // For students, mark which lessons they've completed
  if (req.user.role === 'student') {
    const userProgress = await UserProgress.findOne({ user: req.user._id });
    
    const lessonsWithProgress = lessons.map(lesson => {
      const isCompleted = userProgress?.completedLessons.some(
        completedLesson => completedLesson.lesson.toString() === lesson._id.toString()
      );
      
      return {
        ...lesson._doc,
        isCompleted: isCompleted || false
      };
    });
    
    res.json(lessonsWithProgress);
  } else {
    res.json(lessons);
  }
};

// @desc    Get a specific lesson
// @route   GET /api/lessons/:id
// @access  Private
const getLessonById = async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  
  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }
  
  res.json(lesson);
};

// @desc    Mark lesson as completed
// @route   POST /api/lessons/:id/complete
// @access  Private/Student
const completeLesson = async (req, res) => {
  const lessonId = req.params.id;
  
  // Check if lesson exists
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }
  
  // Find or create user progress
  let userProgress = await UserProgress.findOne({ user: req.user._id });
  
  if (!userProgress) {
    userProgress = await UserProgress.create({
      user: req.user._id,
      completedLessons: [],
      passedTests: [],
      solvedTasks: []
    });
  }
  
  // Check if already completed
  const alreadyCompleted = userProgress.completedLessons.some(
    lesson => lesson.lesson.toString() === lessonId
  );
  
  if (!alreadyCompleted) {
    userProgress.completedLessons.push({
      lesson: lessonId,
      completedAt: Date.now()
    });
    
    await userProgress.save();
  }
  
  res.status(200).json({ message: 'Lesson marked as completed' });
};

module.exports = {
  createLesson,
  getLessons,
  getLessonById,
  completeLesson
};