const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const UserProgress = require('../models/userProgressModel');

// Настройка логирования в файл для критических ошибок при сохранении прогресса
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logPath = path.join(logDir, 'progress-errors.log');

// Функция записи в лог-файл
const logToFile = (message, data) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n\n`;
  
  fs.appendFile(logPath, logMessage, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
  
  console.log(message, data);
};

/**
 * Надежное сохранение прогресса студента с множественными стратегиями и резервными вариантами
 */
const saveTestProgress = async (userId, testId, testData) => {
  console.log(`Сохранение прогресса для теста ${testId} пользователя ${userId}`);
  
  // Убедимся, что у нас правильные форматы данных
  const safeTestData = {
    ...testData,
    test: testId.toString(),
    answers: Array.isArray(testData.answers) ? 
      testData.answers.map(a => ({
        questionId: a.questionId.toString(),
        optionId: a.optionId.toString(),
        correct: !!a.correct,
        points: Number(a.points) || 0
      })) : []
  };
  
  let savedProgress = null;
  let errorDetails = [];
  
  // Стратегия 1: findOne + save
  try {
    console.log('Стратегия 1: Поиск документа и сохранение изменений');
    let userProgress = await UserProgress.findOne({ user: userId });
    
    if (!userProgress) {
      console.log('Создание нового документа прогресса');
      userProgress = new UserProgress({
        user: userId,
        completedLessons: [],
        passedTests: [safeTestData],
        solvedTasks: []
      });
    } else {
      console.log(`Найден существующий документ прогресса: ${userProgress._id}`);
      
      if (!userProgress.passedTests) {
        userProgress.passedTests = [];
      }
      
      // Проверяем наличие существующего теста
      const testIndex = userProgress.passedTests.findIndex(
        t => t.test && t.test.toString() === testId.toString()
      );
      
      if (testIndex >= 0) {
        console.log(`Обновление существующего результата теста (индекс ${testIndex})`);
        userProgress.passedTests[testIndex] = {
          ...userProgress.passedTests[testIndex].toObject(),
          ...safeTestData
        };
      } else {
        console.log('Добавление нового результата теста');
        userProgress.passedTests.push(safeTestData);
      }
    }
    
    // Сохраняем документ
    savedProgress = await userProgress.save();
    console.log('Прогресс успешно сохранен стратегией 1');
    return savedProgress;
  } catch (error) {
    console.error('Ошибка при сохранении стратегией 1:', error);
    errorDetails.push({ strategy: 1, error: error.message, stack: error.stack });
    // Продолжаем со следующей стратегией
  }
  
  // Стратегия 2: findOneAndUpdate с upsert
  if (!savedProgress) {
    try {
      console.log('Стратегия 2: findOneAndUpdate с upsert');
      
      const testQuery = { 
        user: userId, 
        "passedTests.test": testId 
      };
      
      // Проверяем существует ли запись с этим тестом
      const existingRecord = await UserProgress.findOne(testQuery);
      
      if (existingRecord) {
        // Обновляем существующий тест
        console.log('Обновление существующего теста через findOneAndUpdate');
        const updateResult = await UserProgress.findOneAndUpdate(
          testQuery,
          { 
            $set: { 
              "passedTests.$": safeTestData 
            } 
          },
          { new: true }
        );
        
        savedProgress = updateResult;
        console.log('Прогресс успешно обновлен стратегией 2');
      } else {
        // Добавляем новый тест
        console.log('Добавление нового теста через findOneAndUpdate + $push');
        const updateResult = await UserProgress.findOneAndUpdate(
          { user: userId },
          { 
            $push: { 
              passedTests: safeTestData 
            } 
          },
          { new: true, upsert: true }
        );
        
        savedProgress = updateResult;
        console.log('Прогресс успешно добавлен стратегией 2');
      }
      
      return savedProgress;
    } catch (error) {
      console.error('Ошибка при сохранении стратегией 2:', error);
      errorDetails.push({ strategy: 2, error: error.message, stack: error.stack });
      // Продолжаем со следующей стратегией
    }
  }
  
  // Стратегия 3: Прямой updateOne с $set или $push
  if (!savedProgress) {
    try {
      console.log('Стратегия 3: Прямой updateOne');
      
      // Проверяем наличие записи с этим тестом
      const testQuery = { 
        user: userId, 
        "passedTests.test": testId 
      };
      
      const existingDocument = await UserProgress.findOne(testQuery);
      let updateResult;
      
      if (existingDocument) {
        // Получаем индекс теста в массиве
        const testIndex = existingDocument.passedTests.findIndex(
          t => t.test && t.test.toString() === testId.toString()
        );
        
        if (testIndex >= 0) {
          console.log(`Обновление теста по индексу ${testIndex} через updateOne`);
          updateResult = await UserProgress.updateOne(
            { user: userId },
            { $set: { [`passedTests.${testIndex}`]: safeTestData } }
          );
        } else {
          console.log('Добавление теста через updateOne + $push');
          updateResult = await UserProgress.updateOne(
            { user: userId },
            { $push: { passedTests: safeTestData } }
          );
        }
      } else {
        // Создание нового документа
        console.log('Создание нового документа через updateOne + upsert');
        updateResult = await UserProgress.updateOne(
          { user: userId },
          { 
            $set: { 
              user: userId,
              completedLessons: [],
              solvedTasks: []
            },
            $push: { 
              passedTests: safeTestData 
            } 
          },
          { upsert: true }
        );
      }
      
      console.log('Результат операции updateOne:', updateResult);
      
      if (updateResult.acknowledged) {
        console.log('Прогресс успешно сохранен стратегией 3');
        // Получаем обновленный документ
        savedProgress = await UserProgress.findOne({ user: userId });
        return savedProgress;
      }
    } catch (error) {
      console.error('Ошибка при сохранении стратегией 3:', error);
      errorDetails.push({ strategy: 3, error: error.message, stack: error.stack });
    }
  }
  
  // Стратегия 4: Использование нативного драйвера MongoDB
  if (!savedProgress) {
    try {
      console.log('Стратегия 4: Нативный драйвер MongoDB');
      
      // Доступ к нативному драйверу
      const db = mongoose.connection.db;
      const collection = db.collection('userprogresses');
      
      // Проверка существования документа
      const existingDoc = await collection.findOne({ 
        user: mongoose.Types.ObjectId(userId),
        "passedTests.test": mongoose.Types.ObjectId(testId)
      });
      
      if (existingDoc) {
        // Обновление существующего теста
        console.log('Обновление существующего теста через нативный драйвер');
        
        // Найдем индекс теста в массиве
        let testIndex = -1;
        if (existingDoc.passedTests) {
          testIndex = existingDoc.passedTests.findIndex(
            t => t.test && t.test.toString() === testId.toString()
          );
        }
        
        if (testIndex >= 0) {
          // Обновим по индексу
          await collection.updateOne(
            { _id: existingDoc._id },
            { $set: { [`passedTests.${testIndex}`]: {
              ...safeTestData,
              test: mongoose.Types.ObjectId(testId)
            } } }
          );
        } else {
          // Добавим новый результат
          await collection.updateOne(
            { _id: existingDoc._id },
            { $push: { passedTests: {
              ...safeTestData,
              test: mongoose.Types.ObjectId(testId)
            } } }
          );
        }
      } else {
        // Создание нового документа или добавление теста
        const userDoc = await collection.findOne({ 
          user: mongoose.Types.ObjectId(userId)
        });
        
        if (userDoc) {
          // Добавление нового теста к существующему пользователю
          await collection.updateOne(
            { _id: userDoc._id },
            { $push: { passedTests: {
              ...safeTestData,
              test: mongoose.Types.ObjectId(testId)
            } } }
          );
        } else {
          // Создание полностью нового документа
          await collection.insertOne({
            user: mongoose.Types.ObjectId(userId),
            completedLessons: [],
            passedTests: [{
              ...safeTestData,
              test: mongoose.Types.ObjectId(testId)
            }],
            solvedTasks: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      
      console.log('Прогресс успешно сохранен стратегией 4');
      // Получим обновленный документ через Mongoose
      savedProgress = await UserProgress.findOne({ user: userId });
      return savedProgress;
    } catch (error) {
      console.error('Ошибка при сохранении стратегией 4:', error);
      errorDetails.push({ strategy: 4, error: error.message, stack: error.stack });
    }
  }
  
  // Если дошли сюда, значит ни одна стратегия не сработала
  // Записываем в лог-файл детали ошибки для диагностики
  logToFile('Все стратегии сохранения прогресса не удались', {
    userId,
    testId,
    testData: safeTestData,
    errors: errorDetails
  });
  
  throw new Error(`Не удалось сохранить прогресс теста после всех попыток. См. лог-файл: ${logPath}`);
};

module.exports = {
  saveTestProgress,
  logToFile
}; 