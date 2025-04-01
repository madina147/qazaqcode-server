const Task = require('../models/taskModel');
const UserProgress = require('../models/userProgressModel');
const User = require('../models/userModel');

// @desc    Create a new task (teacher only)
// @route   POST /api/tasks
// @access  Private/Teacher
const createTask = async (req, res) => {
  const { title, description, difficulty, pointsReward, testId, testCases, hints, solutionTemplate } = req.body;

  const task = await Task.create({
    title,
    description,
    difficulty,
    pointsReward,
    test: testId,
    testCases,
    hints,
    solutionTemplate
  });

  if (task) {
    res.status(201).json(task);
  } else {
    res.status(400);
    throw new Error('Invalid task data');
  }
};

// @desc    Get tasks for a specific test
// @route   GET /api/tasks/test/:testId
// @access  Private
const getTasksByTestId = async (req, res) => {
  const tasks = await Task.find({ test: req.params.testId });
  
  if (req.user.role === 'student') {
    // Check if student has passed the test
    const userProgress = await UserProgress.findOne({ user: req.user._id });
    const hasPassed = userProgress?.passedTests.some(
      test => test.test.toString() === req.params.testId && test.score >= 70
    );
    
    if (!hasPassed) {
      res.status(403);
      throw new Error('You need to pass the test first');
    }
    
    // Mark tasks that have been solved
    const tasksWithProgress = tasks.map(task => {
      const solvedTask = userProgress?.solvedTasks.find(
        st => st.task.toString() === task._id.toString()
      );
      
      return {
        ...task._doc,
        isSolved: !!solvedTask,
        timeSpent: solvedTask?.timeSpent || 0
      };
    });
    
    res.json(tasksWithProgress);
  } else {
    res.json(tasks);
  }
};

// @desc    Get a specific task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  
  if (req.user.role === 'student') {
    // Check if student has passed the associated test
    const userProgress = await UserProgress.findOne({ user: req.user._id });
    const hasPassed = userProgress?.passedTests.some(
      test => test.test.toString() === task.test.toString() && test.score >= 70
    );
    
    if (!hasPassed) {
      res.status(403);
      throw new Error('You need to pass the test first');
    }
  }
  
  res.json(task);
};

// @desc    Submit a solution
// @route   POST /api/tasks/:id/submit
// @access  Private/Student
const submitSolution = async (req, res) => {
  const taskId = req.params.id;
  const { solution, timeSpent } = req.body;
  
  const task = await Task.findById(taskId);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  
  // In a real application, we would execute the code against test cases
  // For now, we'll simulate AI checking with random success
  const isCorrect = Math.random() > 0.3; // 70% chance of success for demo
  
  if (isCorrect) {
    // Update user progress
    let userProgress = await UserProgress.findOne({ user: req.user._id });
    
    if (!userProgress) {
      userProgress = await UserProgress.create({
        user: req.user._id,
        completedLessons: [],
        passedTests: [],
        solvedTasks: []
      });
    }
    
    // Check if already solved
    const taskIndex = userProgress.solvedTasks.findIndex(
      t => t.task.toString() === taskId
    );
    
    if (taskIndex >= 0) {
      // Update existing record
      userProgress.solvedTasks[taskIndex].solution = solution;
      userProgress.solvedTasks[taskIndex].timeSpent = timeSpent;
      userProgress.solvedTasks[taskIndex].solvedAt = Date.now();
    } else {
      // Add new record
      userProgress.solvedTasks.push({
        task: taskId,
        solution,
        timeSpent,
        solvedAt: Date.now()
      });
      
      // Award points to user
      const user = await User.findById(req.user._id);
      user.points += task.pointsReward;
      await user.save();
    }
    
    await userProgress.save();
    
    res.json({
      success: true,
      message: 'Solution is correct!',
      pointsAwarded: task.pointsReward
    });
  } else {
    res.json({
      success: false,
      message: 'Solution is incorrect. Try again.'
    });
  }
};

module.exports = {
  createTask,
  getTasksByTestId,
  getTaskById,
  submitSolution
};