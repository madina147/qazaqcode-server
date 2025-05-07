// Import with the correct structure for version 0.2.0
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Assignment = require('../models/assignmentModel');
const Submission = require('../models/submissionModel');
const User = require('../models/userModel');
const config = require('../config');

// Инициализация клиента Gemini API с версией 0.2.0 "AIzaSyCaoZoK6b2XVk8CX-R3-zPLgfH8c2_ML-Q"
let genAI;
try {
  // Check if API key exists
  const apiKey = config.ai.apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('WARNING: Google AI API key is missing. AI evaluation will fail.');
  } else {
    console.log('Initializing Google Gemini API client');
    genAI = new GoogleGenerativeAI(apiKey);
  }
} catch (error) {
  console.error('Failed to initialize Google Gemini API client:', error);
}

// @desc    Get a single assignment by ID
// @route   GET /api/assignments/:id
// @access  Private
const getAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    const assignment = await Assignment.findById(assignmentId)
      .populate('createdBy', 'firstName lastName')
      .populate('group', 'name');
    
    if (!assignment) {
      return res.status(404).json({ message: 'Тапсырма табылмады' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({ message: 'Тапсырманы жүктеу кезінде қате пайда болды' });
  }
};

// @desc    Submit solution for an assignment
// @route   POST /api/assignments/:id/submit
// @access  Private/Student
const submitSolution = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { solution } = req.body;
    
    // Check if assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Тапсырма табылмады' });
    }
    
    // Check if deadline has passed
    if (new Date(assignment.deadline) < new Date()) {
      return res.status(400).json({ message: 'Тапсыру мерзімі өтіп кетті' });
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
    
    // Check if student has already submitted a solution
    let submission = await Submission.findOne({
      assignment: assignmentId,
      student: req.user._id
    });
    
    if (submission) {
      // Update existing submission
      submission.solution = solution;
      if (attachments.length > 0) {
        submission.attachments = attachments;
      }
      submission.status = 'submitted';
      submission.submittedAt = Date.now();
      
      // Reset evaluations
      submission.aiEvaluation = undefined;
      submission.teacherEvaluation = undefined;
      
      await submission.save();
    } else {
      // Create new submission
      submission = await Submission.create({
        assignment: assignmentId,
        student: req.user._id,
        solution,
        attachments,
        status: 'submitted'
      });
      
      // Add submission to assignment's submissions array
      await Assignment.findByIdAndUpdate(
        assignmentId,
        { $addToSet: { submissions: submission._id } }
      );
    }
    
    // Trigger AI evaluation in the background
    if (config.ai.evaluationEnabled) {
      console.log(`AI evaluation enabled, triggering for submission: ${submission._id}`);
      try {
        // Run AI evaluation asynchronously without awaiting
        evaluateWithAI(submission._id).catch(err => {
          console.error('AI evaluation failed with error:', err.message);
          console.error('Stack trace:', err.stack);
        });
      } catch (error) {
        console.error('Failed to start AI evaluation:', error);
      }
    } else {
      console.log(`AI evaluation disabled for submission: ${submission._id}`);
    }
    
    res.status(201).json({
      _id: submission._id,
      message: 'Шешім сәтті жіберілді'
    });
  } catch (error) {
    console.error('Error submitting solution:', error);
    res.status(500).json({ message: 'Шешімді жіберу кезінде қате пайда болды' });
  }
};

// Helper function for AI evaluation using Google Gemini API
const evaluateWithAI = async (submissionId) => {
  try {
    console.log(`Starting AI evaluation for submission: ${submissionId}`);
    const submission = await Submission.findById(submissionId)
      .populate('assignment');
    
    if (!submission) {
      console.error(`Submission not found: ${submissionId}`);
      throw new Error('Submission not found');
    }
    
    if (!submission.assignment || !submission.assignment.description) {
      console.error(`Assignment or description missing for submission: ${submissionId}`);
      throw new Error('Assignment data is missing or incomplete');
    }
    
    if (!submission.solution) {
      console.error(`Solution missing for submission: ${submissionId}`);
      throw new Error('Solution is missing');
    }
    
    // Log the length of the data to be sent
    console.log(`Assignment description length: ${submission.assignment.description.length}`);
    console.log(`Solution length: ${submission.solution.length}`);
    
    // Формирование текста для промпта
    const promptText = `
      Ты - опытный преподаватель программирования. Твоя задача - оценить решение студента и дать ему персонализированную, детальную обратную связь.
      
      ЗАДАНИЕ:
      ${submission.assignment.description}
      
      ОТВЕТ СТУДЕНТА:
      ${submission.solution}
      
      Оцени решение студента по шкале от 0 до 100 баллов, где:
      - 0-50: Неверное решение или серьезные ошибки
      - 51-70: Частично верное решение с несколькими ошибками
      - 71-85: В целом верное решение с некоторыми недочетами
      - 86-100: Отличное решение, полностью соответствующее заданию
      
      Дай очень подробную и персональную обратную связь на казахском языке, включив следующие пункты:
      1. Конкретные сильные стороны в решении студента
      2. Конкретные ошибки или недочеты, которые нашел
      3. Детальные рекомендации по улучшению кода
      4. Объяснение сложных концепций, которые студент, возможно, не понял
      5. Примеры альтернативных подходов к решению
      
      Избегай общих и шаблонных фраз. Твой отзыв должен быть уникальным и основанным исключительно на представленном коде.
      
      Твой ответ должен быть в следующем формате JSON:
      {
        "score": (число от 0 до 100),
        "feedback": "Детальная и персонализированная обратная связь на казахском языке"
      }
      
      ВАЖНО: формируй ответ только в JSON-формате, без дополнительного текста до или после JSON.
    `;
    
    try {
      console.log(`Initializing Gemini API with model: ${config.ai.model || 'gemini-pro'}`);
      console.log(`API Key available: ${!!config.ai.apiKey}`);
      
      // Check if Gemini API client is initialized
      if (!genAI) {
        throw new Error('Gemini API client is not initialized. Check API key configuration.');
      }
      
      // Создание модели с правильным API версии 0.2.0
      const modelName = config.ai.model || 'gemini-pro';
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Создание промпта с правильными настройками
      const generationConfig = {
        temperature: config.ai.temperature || 0.7,
        maxOutputTokens: 2048,
      };
      
      console.log('Starting AI request with timeout');
      // Установка таймаута для запроса
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI evaluation timed out')), 
        config.ai.defaultTimeout || 30000)
      );
      
      // Отправка запроса к Gemini API с таймаутом
      const responsePromise = model.generateContent(promptText, generationConfig);
      const responseResult = await Promise.race([responsePromise, timeoutPromise]);
      
      if (!responseResult) {
        throw new Error('Empty response from Gemini API');
      }
      
      // Получение текста ответа из текущей структуры ответа API
      const response = responseResult.response || responseResult;
      let responseText = '';
      
      // Get text from the new API structure
      if (response.text) {
        responseText = response.text();
      } else if (response.candidates && response.candidates.length > 0) {
        responseText = response.candidates[0].content.parts[0].text;
      } else if (responseResult.text) {
        responseText = responseResult.text();
      } else {
        console.error('Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unable to extract text from AI response');
      }
      
      console.log(`Received response of length: ${responseText.length}`);
      
      // Log first 100 characters to help with debugging
      console.log(`Response preview: ${responseText.substring(0, 100)}...`);
      
      // Попытка извлечь JSON из ответа
      let aiEvaluation;
      try {
        // Ищем JSON в тексте ответа с улучшенным регулярным выражением
        const jsonMatch = responseText.match(/\{[\s\S]*"score"[\s]*:[\s]*\d+[\s\S]*"feedback"[\s]*:[\s]*"[\s\S]*"\s*\}/);
        
        if (jsonMatch) {
          console.log('Found JSON in response');
          aiEvaluation = JSON.parse(jsonMatch[0]);
          console.log(`Parsed evaluation score: ${aiEvaluation.score}`);
        } else {
          console.log('No JSON found, attempting to extract score from text');
          // Расширенный поиск чисел, которые могут быть оценкой
          const scoreMatch = responseText.match(/\bscore\s*[:=]\s*(\d+)/i) || 
                            responseText.match(/(\d+)\s*\/\s*100/) ||
                            responseText.match(/(\d+)\s*баллов/i) ||
                            responseText.match(/(\d+)\s*балл/i) ||
                            responseText.match(/оценка\s*[:=]\s*(\d+)/i) ||
                            responseText.match(/баға\s*[:=]\s*(\d+)/i);
          
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
          console.log(`Extracted score: ${score}`);
          
          // Используем весь текст ответа как обратную связь
          aiEvaluation = {
            score: Math.min(Math.max(score, 0), 100), // Ограничиваем оценку от 0 до 100
            feedback: responseText
          };
        }
      } catch (error) {
        console.error('Error parsing AI response:', error);
        // Log the response for debugging
        console.error('Response was:', responseText);
        
        // Используем исходный ответ AI как есть
        aiEvaluation = {
          score: 75, // Средняя оценка по умолчанию
          feedback: responseText
        };
      }
      
      // Проверка на валидность оценки
      if (typeof aiEvaluation.score !== 'number' || isNaN(aiEvaluation.score)) {
        console.error('Invalid score in AI evaluation:', aiEvaluation.score);
        aiEvaluation.score = 75;
      }
      
      // Убедимся, что обратная связь это строка
      if (typeof aiEvaluation.feedback !== 'string') {
        console.error('Invalid feedback in AI evaluation:', aiEvaluation.feedback);
        aiEvaluation.feedback = 'Жауап алу барысында қате пайда болды.';
      }
      
      // Обновление записи в базе данных
      submission.aiEvaluation = {
        score: aiEvaluation.score,
        feedback: aiEvaluation.feedback,
        evaluatedAt: Date.now()
      };
      
      submission.status = 'ai_evaluated';
      console.log(`Saving AI evaluation with score: ${aiEvaluation.score}`);
      await submission.save();
      console.log(`AI evaluation completed for submission: ${submissionId}`);
      
      return submission;
    } catch (error) {
      console.error('Gemini API error:', error);
      console.error('Stack trace:', error.stack);
      
      // Get default score from config or use 50 if not defined
      const defaultScore = config.ai.defaultErrorScore || 50;
      
      // Store detailed error for debugging purposes
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      submission.aiEvaluation = {
        score: defaultScore,
        feedback: "ИИ бағалау жүйесінде техникалық қиындықтар туындады. Жауабыңыз оқытушымен тексерілетін болады. Кешіріміз қабыл алыңыз.",
        evaluatedAt: Date.now(),
        errorDetails: errorDetails
      };
      submission.status = 'pending_teacher_review';
      await submission.save();
      console.log(`Set submission ${submissionId} to pending_teacher_review due to error`);
      return submission;
    }
  } catch (error) {
    console.error('AI evaluation processing error:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// @desc    Get submissions for an assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private/Teacher
const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    // Check if assignment exists and teacher owns it
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Тапсырма табылмады' });
    }
    
    // Get all submissions for this assignment
    const submissions = await Submission.find({ assignment: assignmentId })
      .populate('student', 'firstName lastName grade gradeLetter')
      .sort('-submittedAt');
    
    res.json(submissions);
  } catch (error) {
    console.error('Error getting submissions:', error);
    res.status(500).json({ message: 'Шешімдерді жүктеу кезінде қате пайда болды' });
  }
};

// @desc    Get a student's submission for an assignment
// @route   GET /api/assignments/:id/my-submission
// @access  Private/Student
const getMySubmission = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    // Find submission for this student and assignment
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
};

// @desc    Teacher evaluates a submission
// @route   PUT /api/submissions/:id/evaluate
// @access  Private/Teacher
const evaluateSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { score, feedback } = req.body;
    
    if (score < 0 || score > 100) {
      return res.status(400).json({ message: 'Баға 0-100 аралығында болуы керек' });
    }
    
    // Find submission
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'assignment',
        select: 'createdBy'
      });
    
    if (!submission) {
      return res.status(404).json({ message: 'Шешім табылмады' });
    }
    
    // Check if teacher owns the assignment
    if (submission.assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Бұл шешімді бағалауға рұқсатыңыз жоқ' });
    }
    
    // Update teacher evaluation
    submission.teacherEvaluation = {
      score,
      feedback,
      evaluatedAt: Date.now()
    };
    
    submission.status = 'teacher_evaluated';
    await submission.save();
    
    // Update student points
    const student = await User.findById(submission.student);
    if (student) {
      // Give points proportional to the score (max 10 points for 100% score)
      const pointsToAdd = Math.round(score / 10);
      student.points += pointsToAdd;
      await student.save();
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error evaluating submission:', error);
    res.status(500).json({ message: 'Шешімді бағалау кезінде қате пайда болды' });
  }
};

module.exports = {
  getAssignment,
  submitSolution,
  getAssignmentSubmissions,
  getMySubmission,
  evaluateSubmission
}; 