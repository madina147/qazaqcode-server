const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const Test = require('../models/Test');
const Group = require('../models/Group');
const User = require('../models/User');
const TestResult = require('../models/TestResult');
const auth = require('../middleware/auth');
const { isTeacher, isGroupMember } = require('../middleware/groupAccess');

// Create a new test
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Create new test
    const newTest = new Test({
      title: req.body.title,
      description: req.body.description,
      timeLimit: req.body.timeLimit,
      deadline: new Date(req.body.deadline),
      questions: req.body.questions,
      group: groupId,
      createdBy: req.user.id
    });
    
    await newTest.save();
    
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all tests for a group
router.get('/', auth, isGroupMember, async (req, res) => {
  try {
    const { groupId } = req.params;
    const isStudentRole = req.user.role === 'student';
    
    let tests = await Test.find({ group: groupId })
      .sort({ createdAt: -1 })
      .select(isStudentRole ? '-questions.options.isCorrect' : '');
    
    // For student view, add their test status and score
    if (isStudentRole) {
      const testResults = await TestResult.find({
        student: req.user.id,
        test: { $in: tests.map(test => test._id) }
      });
      
      tests = tests.map(test => {
        const testDoc = test.toObject();
        const result = testResults.find(r => r.test.toString() === test._id.toString());
        
        if (result) {
          testDoc.studentStatus = result.completed ? 'Completed' : 'In Progress';
          testDoc.studentScore = result.score;
        }
        
        return testDoc;
      });
    } else {
      // For teacher view, add completion stats
      const testIds = tests.map(test => test._id);
      const testResults = await TestResult.find({
        test: { $in: testIds },
        completed: true
      });
      
      tests = await Promise.all(tests.map(async test => {
        const testDoc = test.toObject();
        const testResultsForThisTest = testResults.filter(
          result => result.test.toString() === test._id.toString()
        );
        
        testDoc.completedCount = testResultsForThisTest.length;
        
        if (testResultsForThisTest.length > 0) {
          const totalScores = testResultsForThisTest.reduce((sum, result) => sum + result.score, 0);
          testDoc.averageScore = totalScores / testResultsForThisTest.length;
        }
        
        // Calculate total possible points
        const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0);
        testDoc.totalPoints = totalPoints;
        
        return testDoc;
      }));
    }
    
    res.json(tests);
  } catch (error) {
    console.error('Error getting tests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get test by ID
router.get('/:testId', auth, isGroupMember, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    const isStudentRole = req.user.role === 'student';
    
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    }).select(isStudentRole && '-questions.options.isCorrect');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // For students attempting the test, check deadline
    if (isStudentRole && !req.query.review) {
      const now = new Date();
      if (now > new Date(test.deadline)) {
        return res.status(403).json({ message: 'Test deadline has passed' });
      }
      
      // Check if already completed
      const existingResult = await TestResult.findOne({
        test: testId,
        student: req.user.id,
        completed: true
      });
      
      if (existingResult) {
        return res.status(403).json({ message: 'You have already completed this test' });
      }
    }
    
    // For teacher or student reviewing their completed test
    const testData = test.toObject();
    
    if (isStudentRole && req.query.review) {
      const result = await TestResult.findOne({
        test: testId,
        student: req.user.id,
        completed: true
      });
      
      if (result) {
        testData.studentAnswers = result.answers;
        testData.score = result.score;
      }
    }
    
    res.json(testData);
  } catch (error) {
    console.error('Error getting test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update test
router.put('/:testId', auth, isTeacher, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    
    // Check if test exists and belongs to the group
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if user is the creator of the test
    if (test.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this test' });
    }
    
    // Check if any students have already taken the test
    const existingResults = await TestResult.findOne({ test: testId });
    if (existingResults) {
      return res.status(403).json({ 
        message: 'Cannot modify test as students have already taken it'
      });
    }
    
    // Update test
    const updatedFields = {
      title: req.body.title,
      description: req.body.description,
      timeLimit: req.body.timeLimit,
      deadline: new Date(req.body.deadline),
      questions: req.body.questions,
      updatedAt: Date.now()
    };
    
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { $set: updatedFields },
      { new: true }
    );
    
    res.json(updatedTest);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete test
router.delete('/:testId', auth, isTeacher, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    
    // Check if test exists and belongs to the group
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if user is the creator of the test
    if (test.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this test' });
    }
    
    // Delete test and all related results
    await Promise.all([
      Test.findByIdAndDelete(testId),
      TestResult.deleteMany({ test: testId })
    ]);
    
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit test answers
router.post('/:testId/submit', auth, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    const studentId = req.user.id;
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit tests' });
    }
    
    // Check if student belongs to the group
    const group = await Group.findOne({
      _id: groupId,
      students: studentId
    });
    
    if (!group) {
      return res.status(403).json({ message: 'You do not belong to this group' });
    }
    
    // Get the test
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if deadline has passed
    const now = new Date();
    if (now > new Date(test.deadline)) {
      return res.status(403).json({ message: 'Test deadline has passed' });
    }
    
    // Check if already completed
    const existingResult = await TestResult.findOne({
      test: testId,
      student: studentId,
      completed: true
    });
    
    if (existingResult) {
      return res.status(403).json({ message: 'You have already completed this test' });
    }
    
    // Calculate score
    const studentAnswers = req.body.answers;
    let score = 0;
    const scoredAnswers = [];
    
    // Iterate through test questions and check answers
    test.questions.forEach(question => {
      const questionId = question._id.toString();
      const studentAnswer = studentAnswers.find(a => a.questionId === questionId);
      
      if (studentAnswer) {
        // Save student's choice
        const answerData = {
          questionId,
          selectedOptionId: studentAnswer.optionId
        };
        
        // Check if answer is correct
        const correctOption = question.options.find(o => o.isCorrect);
        const isCorrect = correctOption && studentAnswer.optionId === correctOption._id.toString();
        
        if (isCorrect) {
          score += question.points;
          answerData.isCorrect = true;
        } else {
          answerData.isCorrect = false;
        }
        
        scoredAnswers.push(answerData);
      }
    });
    
    // Create or update test result
    let testResult = await TestResult.findOne({
      test: testId,
      student: studentId
    });
    
    if (testResult) {
      testResult.answers = scoredAnswers;
      testResult.score = score;
      testResult.completed = true;
      testResult.submittedAt = Date.now();
      await testResult.save();
    } else {
      testResult = new TestResult({
        test: testId,
        student: studentId,
        answers: scoredAnswers,
        score,
        completed: true,
        submittedAt: Date.now()
      });
      await testResult.save();
    }
    
    res.json({
      message: 'Test submitted successfully',
      score,
      maxScore: test.questions.reduce((sum, q) => sum + q.points, 0)
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start taking a test (create initial test result)
router.post('/:testId/start', auth, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    const studentId = req.user.id;
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can take tests' });
    }
    
    // Check if student belongs to the group
    const group = await Group.findOne({
      _id: groupId,
      students: studentId
    });
    
    if (!group) {
      return res.status(403).json({ message: 'You do not belong to this group' });
    }
    
    // Get the test
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if deadline has passed
    const now = new Date();
    if (now > new Date(test.deadline)) {
      return res.status(403).json({ message: 'Test deadline has passed' });
    }
    
    // Check if already completed
    const existingCompletedResult = await TestResult.findOne({
      test: testId,
      student: studentId,
      completed: true
    });
    
    if (existingCompletedResult) {
      return res.status(403).json({ message: 'You have already completed this test' });
    }
    
    // Create or get existing in-progress result
    let testResult = await TestResult.findOne({
      test: testId,
      student: studentId,
      completed: false
    });
    
    if (!testResult) {
      testResult = new TestResult({
        test: testId,
        student: studentId,
        answers: [],
        completed: false,
        startedAt: Date.now()
      });
      await testResult.save();
    }
    
    res.json({
      message: 'Test started successfully',
      testResult: {
        id: testResult._id,
        startedAt: testResult.startedAt,
        timeLimit: test.timeLimit
      }
    });
  } catch (error) {
    console.error('Error starting test:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get test results for teacher
router.get('/:testId/results', auth, isTeacher, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    
    // Check if test exists and belongs to the group
    const test = await Test.findOne({
      _id: testId,
      group: groupId
    });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Get all results for this test
    const results = await TestResult.find({
      test: testId,
      completed: true
    }).populate('student', 'name email');
    
    // Get total possible points
    const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0);
    
    // Calculate average score
    let averageScore = 0;
    if (results.length > 0) {
      const totalScores = results.reduce((sum, result) => sum + result.score, 0);
      averageScore = totalScores / results.length;
    }
    
    // Get students who haven't taken the test
    const group = await Group.findById(groupId).populate('students', 'name email');
    const studentsNotTaken = group.students.filter(student => 
      !results.some(result => result.student._id.toString() === student._id.toString())
    );
    
    res.json({
      testTitle: test.title,
      totalStudents: group.students.length,
      completedCount: results.length,
      averageScore,
      totalPoints,
      results,
      studentsNotTaken
    });
  } catch (error) {
    console.error('Error getting test results:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get test results (Removed isTeacher middleware for now, updated route)
router.get('/groups/:groupId/tests/:testId/results', auth, async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    const studentId = req.user._id || req.user.id; // Support both _id and id formats
    
    console.log('Fetching results for:', { groupId, testId, studentId });

    // Check if test exists and belongs to the group
    const test = await Test.findOne({
      _id: mongoose.Types.ObjectId.isValid(testId) ? testId : null,
      group: mongoose.Types.ObjectId.isValid(groupId) ? groupId : null
    }).populate('questions.options'); // Populate options needed for display
    
    if (!test) {
      console.error(`Test not found for ID: ${testId} in group: ${groupId}`);
      return res.status(404).json({ message: 'Тест табылмады немесе осы топқа жатпайды' });
    }
    
    // Fetch the specific result for the logged-in student
    const userResult = await TestResult.findOne({
      test: testId,
      student: studentId.toString() // Ensure string comparison
    });

    console.log('User result found:', userResult ? 'Yes' : 'No');
    
    if (!userResult) {
      // Check if this student has any results, even incomplete ones
      const anyResult = await TestResult.findOne({
        test: testId,
        student: { $in: [studentId, studentId.toString()] }
      });
      
      console.log('Any result found:', anyResult ? 'Yes' : 'No');
      
      // Try alternative query as a fallback
      if (!anyResult) {
        const alternativeResult = await TestResult.find({
          test: testId
        });
        
        console.log(`Alternative results count: ${alternativeResult.length}`);
        if (alternativeResult.length > 0) {
          console.log('Sample student ID in results:', alternativeResult[0].student);
        }
      }
      
      // It's possible the student hasn't taken the test yet, or results aren't saved.
      return res.status(200).json({ // Changed to 200 to avoid error screen
        message: 'Тест нәтижелері табылмады. Мүмкін сіз тестті әлі тапсырмаған шығарсыз.',
        test: test, // Send test details anyway, so the page can render basic info
        userAnswers: [] // Empty array to prevent frontend errors
      });
    }

    // Prepare the response data similar to what the frontend expects
    const responseData = {
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        questions: test.questions.map(q => ({
          _id: q._id,
          text: q.text,
          points: q.points || 1, // Default to 1 point if not specified
          options: q.options.map(opt => ({ // Ensure options are included
            _id: opt._id,
            text: opt.text,
            isCorrect: opt.isCorrect // Include isCorrect for result display
          })),
        })),
      },
      userAnswers: userResult.answers.map(a => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
      })),
      score: userResult.score, // Include score if needed
    };
    
    res.json(responseData);

  } catch (error) {
    console.error('Error getting single test result:', error);
    // More specific error logging
    if (error.name === 'CastError') {
       console.error(`CastError likely due to invalid ID format. GroupId: ${req.params.groupId}, TestId: ${req.params.testId}`);
       return res.status(400).json({ message: 'Жарамсыз ID форматы', error: error.message });
    }
    res.status(500).json({ message: 'Сервер қатесі: Нәтижелерді алу мүмкін болмады', error: error.message });
  }
});

module.exports = router; 