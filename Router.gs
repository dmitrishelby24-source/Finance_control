/**
 * Главный роутер для обработки входящих запросов от Telegram Webhook.
 * Анализирует обновление и делегирует обработку соответствующим модулям.
 */


/**
 * Обработчик HTTP POST запросов от Telegram Webhook
 * @param {Object} e - Объект события doPost
 * @returns {GoogleAppsScript.Content.TextOutput} Ответ Telegram API
 */

function doPost(e) {
  // 1. НЕМЕДЛЕННО отвечаем Telegram
  const response = ContentService.createTextOutput('OK');
  
  // 2. ВСЮ логику обработки запускаем асинхронно
  // Этот вызов НЕ БЛОКИРУЕТ возврат ответа
  handleRequestAsync(e.postData.contents);
  
  // 3. Ответ уже готов и возвращается мгновенно
  return response;
}

function handleRequestAsync(updateData) {
  // Важно: Используем сервис для отложенного запуска
  // Это официальный способ в GAS для фоновых задач
  try {
    // Сохраняем данные обновления во временное хранилище
    const cache = CacheService.getScriptCache();
    const key = 'update_' + Date.now();
    cache.put(key, updateData, 30); // Храним 30 секунд
    
    // Создаем отложенную задачу
    ScriptApp.newTrigger('processUpdateBackground')
      .timeBased()
      .after(10) // Запустить через 10 мс
      .create();
      
  } catch (err) {
    console.error('Ошибка планирования фоновой задачи:', err);
  }
}

// Эта функция вызывается триггером через несколько миллисекунд
function processUpdateBackground() {
  const cache = CacheService.getScriptCache();
  const keys = cache.getAll(['update_*']); // Получаем все обновления
  
  for (const key in keys) {
    try {
      const update = JSON.parse(keys[key]);
      
      // Здесь вызываем твою логику:
      if (update.message) handleMessage(update.message);
      if (update.callback_query) handleCallbackQuery(update.callback_query);
      
      // Удаляем обработанное обновление
      cache.remove(key);
    } catch (err) {
      console.error('Ошибка обработки обновления:', err);
    }
  }
  
  // Очищаем триггер
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processUpdateBackground') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

/**
 * Обрабатывает входящие сообщения от пользователя
 * @param {Object} message - Объект сообщения от Telegram
 */
function handleMessage(message) {
  // ВАЖНО: Игнорируем сообщения от самого бота
  if (message.from && message.from.is_bot) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Игнорируем сообщение от бота`);
    return; // Прерываем обработку
  }
  
  // ВАЖНО: Игнорируем сообщения без текста
  if (!message.text) {
    return;
  }
  
  const chatId = message.chat.id;
  const text = message.text;
  const telegramId = message.from.id;
  
  // Логируем входящее сообщение
  if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Сообщение от ${telegramId}: ${text}`);
  }
  
  // Обрабатываем команду /start
  if (text.startsWith('/start')) {
    handleStartCommand(chatId, telegramId);
    return;
  }
  
  // Получаем текущее состояние пользователя
  const state = getBotState(chatId);
  
  // Если нет состояния и не команда /start - игнорируем
  if (!state) {
    sendMessage(chatId, 'Пожалуйста, начните с команды /start');
    return;
  }
  
  // Обрабатываем текстовое сообщение в контексте текущего состояния
  handleTextMessage(chatId, text, state);
}

/**
 * Обрабатывает нажатия на inline-кнопки
 * @param {Object} callbackQuery - Объект callback запроса от Telegram
 */
function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const callbackData = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  
  // Логируем callback
  if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Callback от ${chatId}: ${callbackData}`);
  }
  
  // Ответим на callback, чтобы убрать "часики" у кнопки
  answerCallbackQuery(callbackQuery.id);
  
  // Получаем текущее состояние
  const state = getBotState(chatId) || {};
  
  // Обрабатываем callback в зависимости от данных
  handleCallbackAction(chatId, callbackData, state, messageId);
}
