#!/bin/bash

# Останавливаем текущий процесс на порту 5000
echo "Stopping current server process..."
fuser -k 5000/tcp

# Даем процессу время на остановку
sleep 2

# Очистка кэша Node.js
echo "Clearing Node.js cache..."
rm -rf node_modules/.cache

# Устанавливаем режим отладки для mongoose
echo "Setting DEBUG environment..."
export DEBUG=mongoose:*

# Запускаем сервер заново с подробным логированием
echo "Starting server with verbose logging..."
NODE_ENV=development npm run dev 