const Test = require('../models/testModel');
const UserProgress = require('../models/userProgressModel');

// @desc    Create a new test (teacher only)
// @route   POST /api/tests
// @access  Private/Teacher
const createTest = async (req, res) => {
  const { lessonId, questions, passingScore } = req.body;

  const test = await Test.create({
    lesson: lessonId,
    questions,
    passingScore: passingScore || 70
  });

  if (test) {
    res.status(201).json(test);
  } else {
    res.status(400);
    throw new Error('Invalid test data');
  }
};

// @desc    Get a test for a specific lesson
// @route   GET /api/tests/lesson/:lessonId
// @access  Private
const getTestByLessonId = async (req, res) => {
  const test = await Test.findOne({ lesson: req.params.lessonId });
  
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  
  // For students, hide correct answers
  if (req.user.role === 'student') {
    const testForStudent = {
      _id: test._id,
      lesson: test.lesson,
      questions: test.questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options.map(o => ({
          _id: o._id,
          text: o.text
        }))
      })),
      passingScore: test.passingScore
    };
    
    res.json(testForStudent);
  } else {
    res.json(test);
  }
};

// @desc    Submit a test
// @route   POST /api/tests/:id/submit
// @access  Private/Student
const submitTest = async (req, res) => {
  const testId = req.params.id;
  const { answers } = req.body; // Format: [{ questionId, optionId }]
  
  const test = await Test.findById(testId);
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  
  let correctAnswers = 0;
  let totalQuestions = test.questions.length;
  
  // Check answers
  answers.forEach(answer => {
    const question = test.questions.find(q => q._id.toString() === answer.questionId);
    if (question) {
      const selectedOption = question.options.find(o => o._id.toString() === answer.optionId);
      if (selectedOption && selectedOption.isCorrect) {
        correctAnswers++;
      }
    }
  });
  
  const score = (correctAnswers / totalQuestions) * 100;
  const passed = score >= test.passingScore;
  
  // Save progress
  let userProgress = await UserProgress.findOne({ user: req.user._id });
  
  if (!userProgress) {
    userProgress = await UserProgress.create({
      user: req.user._id,
      completedLessons: [],
      passedTests: [],
      solvedTasks: []
    });
  }
  
  // Update or add test result
  const testIndex = userProgress.passedTests.findIndex(
    t => t.test.toString() === testId
  );
  
  if (testIndex >= 0) {
    userProgress.passedTests[testIndex].score = score;
    userProgress.passedTests[testIndex].passedAt = Date.now();
  } else {
    userProgress.passedTests.push({
      test: testId,
      score,
      passedAt: Date.now()
    });
  }
  
  await userProgress.save();
  
  res.json({
    score,
    passed,
    correctAnswers,
    totalQuestions
  });
};

module.exports = {
  createTest,
  getTestByLessonId,
  submitTest
};