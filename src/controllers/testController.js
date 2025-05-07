const Test = require('../models/testModel');
const Group = require('../models/groupModel');
const UserProgress = require('../models/userProgressModel');
const User = require('../models/userModel');
const { saveTestProgress, logToFile } = require('../utils/progressUtils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Create a new test for a group
// @route   POST /api/groups/:groupId/tests
// @access  Private/Teacher
const createTest = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { title, description, timeLimit, deadline, questions } = req.body;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is the teacher of this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('You are not authorized to create tests for this group');
    }

    // Create the test
    const test = await Test.create({
      title,
      description,
      group: groupId,
      createdBy: req.user._id,
      timeLimit: timeLimit || 30,
      deadline,
      questions
    });

    res.status(201).json(test);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to create test');
  }
};

// @desc    Get all tests for a group
// @route   GET /api/groups/:groupId/tests
// @access  Private
const getGroupTests = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Проверка валидности ID
    if (!groupId || groupId === 'undefined') {
      res.status(400);
      throw new Error('Invalid group ID');
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is teacher or student of this group
    const isTeacher = group.teacher.toString() === req.user._id.toString();
    const isStudent = group.students.some(
      student => student.toString() === req.user._id.toString()
    );

    if (!isTeacher && !isStudent) {
      res.status(403);
      throw new Error('You are not authorized to view tests for this group');
    }

    // Get all tests for this group
    const tests = await Test.find({ group: groupId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');

    // For students, hide questions content
    if (req.user.role === 'student') {
      const testsForStudent = tests.map(test => ({
        _id: test._id,
        title: test.title,
        description: test.description,
        timeLimit: test.timeLimit,
        deadline: test.deadline,
        createdBy: test.createdBy,
        createdAt: test.createdAt,
        questionCount: test.questions.length
      }));

      res.json(testsForStudent);
    } else {
      res.json(tests);
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to get tests');
  }
};

// @desc    Get a test by ID
// @route   GET /api/groups/:groupId/tests/:testId
// @access  Private
const getTestById = async (req, res) => {
  try {
    const { groupId, testId } = req.params;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is teacher or student of this group
    const isTeacher = group.teacher.toString() === req.user._id.toString();
    const isStudent = group.students.some(
      student => student.toString() === req.user._id.toString()
    );

    if (!isTeacher && !isStudent) {
      res.status(403);
      throw new Error('You are not authorized to view this test');
    }

    // Get the test
    const test = await Test.findOne({ _id: testId, group: groupId })
      .populate('createdBy', 'firstName lastName');

    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    // For students, hide correct answers
    if (req.user.role === 'student') {
      const testForStudent = {
        _id: test._id,
        title: test.title,
        description: test.description,
        timeLimit: test.timeLimit,
        deadline: test.deadline,
        createdAt: test.createdAt,
        createdBy: test.createdBy,
        questions: test.questions.map(q => ({
          _id: q._id,
          text: q.text,
          points: q.points,
          options: q.options.map(o => ({
            _id: o._id,
            text: o.text
          }))
        }))
      };

      res.json(testForStudent);
    } else {
      res.json(test);
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to get test');
  }
};

// @desc    Update a test
// @route   PUT /api/groups/:groupId/tests/:testId
// @access  Private/Teacher
const updateTest = async (req, res) => {
  try {
    const { groupId, testId } = req.params;
    const { title, description, timeLimit, deadline, questions } = req.body;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is the teacher of this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('You are not authorized to update tests for this group');
    }

    // Find the test
    const test = await Test.findOne({ _id: testId, group: groupId });
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    // Update test fields
    if (title) test.title = title;
    if (description !== undefined) test.description = description;
    if (timeLimit) test.timeLimit = timeLimit;
    if (deadline) test.deadline = deadline;
    if (questions) test.questions = questions;

    // Save the updated test
    await test.save();

    res.json(test);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to update test');
  }
};

// @desc    Delete a test
// @route   DELETE /api/groups/:groupId/tests/:testId
// @access  Private/Teacher
const deleteTest = async (req, res) => {
  try {
    const { groupId, testId } = req.params;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is the teacher of this group
    if (group.teacher.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('You are not authorized to delete tests for this group');
    }

    // Find and delete the test
    const test = await Test.findOneAndDelete({ _id: testId, group: groupId });
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to delete test');
  }
};

// @desc    Submit test answers
// @route   POST /api/groups/:groupId/tests/:testId/submit
// @access  Private/Student
const submitTest = async (req, res) => {
  try {
    console.log('Получен запрос на сохранение ответов теста:', { 
      groupId: req.params.groupId, 
      testId: req.params.testId,
      userId: req.user._id,
      answersCount: req.body.answers?.length || 0,
      timeSpent: req.body.timeSpent || 0
    });

    const { groupId, testId } = req.params;
    const { answers, timeSpent = 0 } = req.body; // Format: [{ questionId, optionId }]

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      console.error('Ошибка: Ответы отсутствуют или имеют неверный формат', answers);
      res.status(400);
      throw new Error('Ответы отсутствуют или имеют неверный формат');
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      console.error('Ошибка: Группа не найдена', groupId);
      res.status(404);
      throw new Error('Group not found');
    }

    // Verify user is a student in this group
    const isStudent = group.students.some(
      student => student.toString() === req.user._id.toString()
    );

    if (!isStudent) {
      console.error('Ошибка: Пользователь не является студентом этой группы', {
        userId: req.user._id,
        groupId
      });
      res.status(403);
      throw new Error('You are not authorized to submit answers for this test');
    }

    // Find the test
    const test = await Test.findOne({ _id: testId, group: groupId });
    if (!test) {
      console.error('Ошибка: Тест не найден', { testId, groupId });
      res.status(404);
      throw new Error('Test not found');
    }

    // Check if the test deadline has passed
    if (test.deadline && new Date() > new Date(test.deadline)) {
      console.error('Ошибка: Срок сдачи теста истек', {
        now: new Date(),
        deadline: test.deadline
      });
      res.status(400);
      throw new Error('Test deadline has passed');
    }

    // Evaluate the answers
    let score = 0;
    let totalPoints = 0;
    const evaluatedAnswers = [];

    console.log('Оценка ответов на тест начата');
    
    try {
      answers.forEach(answer => {
        const question = test.questions.id(answer.questionId);
        if (!question) {
          console.warn('Предупреждение: Вопрос не найден', answer.questionId);
          return;
        }

        totalPoints += question.points;
        const selectedOption = question.options.id(answer.optionId);
        
        if (selectedOption && selectedOption.isCorrect) {
          score += question.points;
          evaluatedAnswers.push({
            questionId: answer.questionId.toString(),
            optionId: answer.optionId.toString(),
            correct: true, 
            points: question.points
          });
        } else {
          evaluatedAnswers.push({
            questionId: answer.questionId.toString(),
            optionId: answer.optionId.toString(),
            correct: false, 
            points: 0
          });
        }
      });

      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      console.log('Оценка ответов завершена:', { score, totalPoints, percentage });

      // Создаем объект с результатами теста
      const testResultData = {
        test: testId,
        score,
        totalPoints,
        percentage,
        passedAt: Date.now(),
        answers: evaluatedAnswers,
        timeSpent: timeSpent || 0
      };

      // Используем новую функцию для надежного сохранения прогресса
      try {
        console.log('Начало сохранения прогресса через надежную утилиту');
        const savedProgress = await saveTestProgress(req.user._id, testId, testResultData);
        console.log('Прогресс успешно сохранен:', {
          userId: req.user._id,
          testId: testId,
          progressId: savedProgress?._id,
          testsCount: savedProgress?.passedTests?.length || 0
        });
      } catch (saveError) {
        // Логируем ошибку, но не прерываем выполнение - отправим клиенту результаты даже если не смогли сохранить
        logToFile('Ошибка при сохранении теста в прогрессе', {
          userId: req.user._id,
          testId,
          error: saveError.message,
          stack: saveError.stack
        });
        
        console.error('Не удалось сохранить прогресс теста:', saveError);
        // Отправляем сообщение об успешном прохождении теста, но невозможности сохранить прогресс
        res.status(206).json({
          score,
          totalPoints,
          percentage,
          timeSpent: timeSpent || 0,
          warning: 'Test completed but progress may not be saved properly. Please contact support.'
        });
        return;
      }

      // Отправка результата клиенту
      console.log('Отправка результата клиенту');
      res.json({
        score,
        totalPoints,
        percentage,
        timeSpent: timeSpent || 0
      });
    } catch (evaluationError) {
      console.error('Ошибка при обработке ответов:', evaluationError);
      logToFile('Ошибка при обработке ответов теста', {
        userId: req.user._id,
        testId,
        answers,
        error: evaluationError.message,
        stack: evaluationError.stack
      });
      
      res.status(500);
      throw new Error(`Error evaluating test answers: ${evaluationError.message}`);
    }
  } catch (error) {
    console.error('Ошибка при отправке теста:', error);
    res.status(error.statusCode || 400);
    throw new Error(error.message || 'Failed to submit test answers');
  }
};

// @desc    Get test results
// @route   GET /api/groups/:groupId/tests/:testId/results
// @access  Private
const getTestResults = async (req, res) => {
  try {
    const { groupId, testId } = req.params;

    // Проверка валидности ID
    if (!groupId || groupId === 'undefined' || !testId || testId === 'undefined') {
      res.status(400);
      throw new Error('Invalid group or test ID');
    }

    // Проверяем существование группы
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Проверяем, имеет ли пользователь доступ к группе
    const isTeacher = group.teacher.toString() === req.user._id.toString();
    const isStudent = group.students.some(
      student => student.toString() === req.user._id.toString()
    );

    if (!isTeacher && !isStudent) {
      res.status(403);
      throw new Error('You are not authorized to view results for this test');
    }

    // Проверяем существование теста
    const test = await Test.findOne({ _id: testId, group: groupId });
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    // Получаем результаты тестов
    if (req.user.role === 'student') {
      // Для студента получаем только его результаты
      const userProgress = await UserProgress.findOne({ user: req.user._id });
      
      if (!userProgress) {
        return res.json({ studentResult: null });
      }
      
      // Initialize passedTests array if it doesn't exist
      if (!userProgress.passedTests) {
        return res.json({ studentResult: null });
      }
      
      const testResult = userProgress.passedTests.find(
        result => result.test && result.test.toString() === testId
      );
      
      if (!testResult) {
        return res.json({ studentResult: null });
      }
      
      // Для студента показываем только его результаты
      return res.json({
        studentResult: {
          testId,
          studentId: req.user._id,
          answers: testResult.answers.map(answer => {
            // Находим вопрос для этого ответа
            const question = test.questions.id(answer.questionId);
            // Находим выбранный вариант
            const selectedOption = question ? question.options.id(answer.optionId) : null;
            
            // Важно: используем прямое значение correct из сохраненного ответа, 
            // либо проверяем, является ли выбранный вариант правильным
            const isCorrect = answer.hasOwnProperty('correct') 
              ? answer.correct 
              : (selectedOption && selectedOption.isCorrect === true);
            
            console.log(`Передача результата студенту: вопрос=${answer.questionId}, ответ=${answer.optionId}, правильный=${isCorrect}`);
            
            return {
              questionId: answer.questionId,
              optionId: answer.optionId,
              correct: isCorrect
            };
          }),
          score: testResult.score,
          totalPoints: testResult.totalPoints,
          percentage: testResult.percentage,
          completedAt: testResult.passedAt,
          timeSpent: testResult.timeSpent || 0
        }
      });
    } else {
      // Для учителя получаем результаты всех студентов
      const students = [];
      
      // Получаем данные каждого студента из группы
      for (const studentId of group.students) {
        const student = await User.findById(studentId);
        const userProgress = await UserProgress.findOne({ user: studentId });
        
        if (student && userProgress && userProgress.passedTests) {
          const testResult = userProgress.passedTests.find(
            result => result.test && result.test.toString() === testId
          );
          
          if (testResult) {
            students.push({
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              answers: testResult.answers || {},
              score: testResult.score,
              totalPoints: testResult.totalPoints,
              percentage: testResult.percentage,
              completedAt: testResult.passedAt,
              timeSpent: testResult.timeSpent || 0
            });
          }
        }
      }
      
      res.json({ students });
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to get test results');
  }
};

// @desc    Get test results for all students (for teacher)
// @route   GET /api/groups/:groupId/tests/:testId/results/all
// @access  Private/Teacher
const getAllStudentResults = async (req, res) => {
  try {
    const { groupId, testId } = req.params;

    // Проверка валидности ID
    if (!groupId || groupId === 'undefined' || !testId || testId === 'undefined') {
      res.status(400);
      throw new Error('Invalid group or test ID');
    }

    // Проверяем существование группы
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    // Проверяем, является ли пользователь учителем этой группы
    const isTeacher = group.teacher.toString() === req.user._id.toString();

    if (!isTeacher) {
      res.status(403);
      throw new Error('You are not authorized to view all student results for this test');
    }

    // Проверяем существование теста
    const test = await Test.findOne({ _id: testId, group: groupId });
    if (!test) {
      res.status(404);
      throw new Error('Test not found');
    }

    // Получаем результаты всех студентов
    const results = [];
    
    // Получаем данные каждого студента из группы
    for (const studentId of group.students) {
      const student = await User.findById(studentId).select('firstName lastName');
      const userProgress = await UserProgress.findOne({ user: studentId });
      
      if (!student) continue;
      
      // Добавляем студента даже если он не проходил тест
      let studentResult = {
        _id: `${student._id}_${testId}`,
        studentId: student._id,
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName
        },
        completed: false,
        answers: [],
        score: 0,
        totalPoints: test.questions.reduce((sum, q) => sum + (q.points || 1), 0),
        percentage: 0,
        timeSpent: 0
      };
      
      // Если студент проходил тест, добавляем его результаты
      if (userProgress && userProgress.passedTests) {
        const testResult = userProgress.passedTests.find(
          result => result.test && result.test.toString() === testId
        );
        
        if (testResult) {
          studentResult = {
            _id: `${student._id}_${testId}`,
            studentId: student._id,
            student: {
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName
            },
            completed: true,
            answers: testResult.answers.map(answer => {
              // Находим вопрос для этого ответа
              const question = test.questions.id(answer.questionId);
              // Находим выбранный вариант
              const selectedOption = question ? question.options.id(answer.optionId) : null;
              
              // Проверяем, является ли ответ правильным
              const isCorrect = answer.hasOwnProperty('correct') 
                ? answer.correct 
                : (selectedOption && selectedOption.isCorrect === true);
              
              return {
                questionId: answer.questionId,
                selectedOptionId: answer.optionId,
                correct: isCorrect
              };
            }),
            score: testResult.score || 0,
            totalPoints: testResult.totalPoints || 0,
            percentage: testResult.percentage || 0,
            submittedAt: testResult.passedAt,
            timeSpent: testResult.timeSpent || 0
          };
        }
      }
      
      results.push(studentResult);
    }
    
    // Считаем общую статистику
    const completedTests = results.filter(r => r.completed);
    const avgScore = completedTests.length > 0 
      ? completedTests.reduce((sum, r) => sum + r.percentage, 0) / completedTests.length 
      : 0;
    
    res.json({
      testId,
      testTitle: test.title,
      totalStudents: group.students.length,
      completedCount: completedTests.length,
      averageScore: avgScore,
      results
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to get all student test results');
  }
};

module.exports = {
  createTest,
  getGroupTests,
  getTestById,
  updateTest,
  deleteTest,
  submitTest,
  getTestResults,
  getAllStudentResults
};