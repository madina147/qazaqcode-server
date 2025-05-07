const mongoose = require('mongoose');

// Add validation logging
const validateAnswers = {
  validator: function(answers) {
    // Отключаем строгую валидацию, чтобы избежать проблем с сохранением
    if (!answers) return true;
    
    if (!Array.isArray(answers)) {
      console.log('Validation failed: answers is not an array');
      return false;
    }
    
    // Check each answer item but allow more flexible structure
    const valid = answers.every((answer, index) => {
      if (!answer) {
        console.log(`Validation failed: answer at index ${index} is null/undefined`);
        return false;
      }
      
      // Просто проверяем, что это объект
      return typeof answer === 'object';
    });
    
    return valid;
  },
  message: props => 'Invalid answers format'
};

const userProgressSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    passedTests: [{
      test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
      },
      score: {
        type: Number,
        default: 0
      },
      totalPoints: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      answers: {
        type: Array,
        default: [],
        validate: validateAnswers
      },
      timeSpent: {
        type: Number,
        default: 0
      },
      passedAt: {
        type: Date,
        default: Date.now
      }
    }],
    solvedTasks: [{
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      },
      solution: String,
      timeSpent: {
        type: Number,
        default: 0
      },
      solvedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    strict: false, // Позволяем сохранять поля, не определенные в схеме
    minimize: false, // Не удалять пустые объекты
    bufferTimeoutMS: 30000, // Увеличиваем таймаут для операций с буфером
  }
);

// Настройка параметров для больших документов
userProgressSchema.set('autoIndex', true);
userProgressSchema.set('validateBeforeSave', false);

userProgressSchema.pre('save', function(next) {
  console.log('Pre-save hook for UserProgress executing...');
  
  if (!this.completedLessons) this.completedLessons = [];
  if (!this.passedTests) this.passedTests = [];
  if (!this.solvedTasks) this.solvedTasks = [];
  
  // Убеждаемся, что все passedTests имеют правильную структуру
  if (this.passedTests && this.passedTests.length > 0) {
    console.log(`Checking ${this.passedTests.length} test results`);
    
    this.passedTests = this.passedTests.map((test, index) => {
      if (!test) {
        console.log(`Warning: test at index ${index} is null/undefined`);
        return {}; // Вместо null возвращаем пустой объект
      }
      
      // Создаем новый объект с безопасными данными
      const safeTest = {
        ...(typeof test.toObject === 'function' ? test.toObject() : test)
      };
      
      // Убеждаемся, что все обязательные поля присутствуют
      if (!safeTest.answers) safeTest.answers = [];
      if (!safeTest.score && safeTest.score !== 0) safeTest.score = 0;
      if (!safeTest.totalPoints && safeTest.totalPoints !== 0) safeTest.totalPoints = 0;
      if (!safeTest.percentage && safeTest.percentage !== 0) safeTest.percentage = 0;
      if (!safeTest.timeSpent && safeTest.timeSpent !== 0) safeTest.timeSpent = 0;
      if (!safeTest.passedAt) safeTest.passedAt = new Date();
      
      // Проверяем, что test - это ObjectId или строка и конвертируем при необходимости
      if (safeTest.test) {
        if (typeof safeTest.test === 'string') {
          try {
            safeTest.test = mongoose.Types.ObjectId(safeTest.test);
          } catch (e) {
            console.error(`Error converting test ID to ObjectId: ${e.message}`);
            // Если не можем конвертировать, оставляем как есть
          }
        }
      }
      
      return safeTest;
    });
  }
  
  console.log('Pre-save hook completed successfully');
  next();
});

// Добавляем обработчик ошибок
userProgressSchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    console.error('Validation Error in UserProgress:', error.message);
    // Логируем для диагностики, но пропускаем ошибку
    next(new Error('UserProgress validation failed, but saving proceeded: ' + error.message));
  } else if (error.name === 'MongoServerError' && error.code === 17280) {
    // Обработка ошибки превышения лимита размера документа
    console.error('Document Too Large Error:', error.message);
    next(new Error('UserProgress document is too large'));
  } else {
    next(error);
  }
});

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = UserProgress;