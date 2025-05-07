const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ratingController = require('../controllers/ratingController');

// Test route to check if ratings controller is responding
router.get('/test', (req, res) => {
  res.json({ message: 'Ratings API is working!' });
});

// Тестовый маршрут для получения рейтингов без аутентификации
router.get('/demo-student/:id', ratingController.getStudentRating);

// Получить рейтинг одного студента
router.get('/student/:id', protect, ratingController.getStudentRating);

// Получить рейтинг всех студентов (для учителя)
router.get('/all-students', protect, ratingController.getAllStudentsRatings);

module.exports = router; 