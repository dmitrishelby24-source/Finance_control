/**
 * Модуль для работы с Telegram Bot API.
 * Отправка сообщений, кнопок, управление состоянием.
 */

// Хранилище состояния пользователей
const USER_STATE_STORE = 'BOT_STATE';

/**
 * Получает текущее состояние пользователя
 * @param {string|number} chatId - ID чата
 * @returns {Object|null} Объект состояния или null
 */
function getBotState(chatId) {
  try {
    const properties = PropertiesService.getUserProperties();
    const key = `${USER_STATE_STORE}_${chatId}`;
    const stateJson = properties.getProperty(key);
    
    return stateJson ? JSON.parse(stateJson) : null;
  } catch (error) {
    logError('Ошибка при получении состояния:', error);
    return null;
  }
}

/**
 * Сохраняет состояние пользователя
 * @param {string|number} chatId - ID чата
 * @param {Object} state - Объект состояния
 */
function setBotState(chatId, state) {
  try {
    const properties = PropertiesService.getUserProperties();
    const key = `${USER_STATE_STORE}_${chatId}`;
    
    if (state) {
      properties.setProperty(key, JSON.stringify(state));
    } else {
      properties.deleteProperty(key);
    }
  } catch (error) {
    logError('Ошибка при сохранении состояния:', error);
  }
}

/**
 * Очищает состояние пользователя
 * @param {string|number} chatId - ID чата
 */
function clearBotState(chatId) {
  setBotState(chatId, null);
}

/**
 * Отправляет сообщение в Telegram
 * @param {string|number} chatId - ID чата
 * @param {string} text - Текст сообщения
 * @param {Object} options - Дополнительные параметры (кнопки и т.д.)
 * @returns {boolean} Успешность отправки
 */
function sendMessage(chatId, text, options = {}) {
  try {
    const payload = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: options.reply_markup || {},
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    };
    
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = UrlFetchApp.fetch(url, payload);
    const responseData = JSON.parse(response.getContentText());
    
    if (!responseData.ok) {
      throw new Error(`Telegram API error: ${responseData.description}`);
    }
    
    return true;
  } catch (error) {
    logError('Ошибка отправки сообщения:', error, { chatId, text: text.substring(0, 100) });
    return false;
  }
}

/**
 * Отправляет ответ на callback query
 * @param {string} callbackQueryId - ID callback запроса
 */
function answerCallbackQuery(callbackQueryId) {
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const payload = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        callback_query_id: callbackQueryId
      })
    };
    
    UrlFetchApp.fetch(url, payload);
  } catch (error) {
    logError('Ошибка ответа на callback:', error);
  }
}

/**
 * Отправляет главное меню с reply-кнопками
 * @param {string|number} chatId - ID чата
 */
function sendMainMenu(chatId) {
  const replyMarkup = {
    keyboard: [
      [{ text: CONFIG.BUTTONS.INCOME }, { text: CONFIG.BUTTONS.EXPENSE }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
  
  sendMessage(chatId, 'Выберите тип операции:', { reply_markup: replyMarkup });
}

/**
 * Отправляет меню категорий расходов
 * @param {string|number} chatId - ID чата
 */
function sendCategoryMenu(chatId) {
  const categories = CONFIG.BUTTONS.CATEGORIES;
  const keyboard = [];
  
  // Разбиваем на ряды по 2 кнопки
  for (let i = 0; i < categories.length; i += 2) {
    const row = categories.slice(i, i + 2).map(text => ({ text }));
    keyboard.push(row);
  }
  
  const replyMarkup = {
    keyboard: keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
  
  sendMessage(chatId, 'Выберите категорию расходов:', { reply_markup: replyMarkup });
}

/**
 * Отправляет inline-клавиатуру со статьями
 * @param {string|number} chatId - ID чата
 * @param {Array<Object>} items - Массив статей
 * @param {string} title - Заголовок сообщения
 */
function sendItemKeyboard(chatId, items, title = 'Выберите статью:') {
  const buttons = [];
  
  // Создаем кнопки (максимум 3 в ряд)
  for (let i = 0; i < items.length; i += 3) {
    const row = items.slice(i, i + 3).map(item => ({
      text: item.name,
      callback_data: `item_${item.code}`
    }));
    buttons.push(row);
  }
  
  const replyMarkup = {
    inline_keyboard: buttons
  };
  
  sendMessage(chatId, title, { reply_markup: replyMarkup });
}

/**
 * Отправляет inline-клавиатуру с кошельками
 * @param {string|number} chatId - ID чата
 * @param {Array<string>} wallets - Массив кошельков
 */
function sendWalletKeyboard(chatId, wallets) {
  const buttons = [];
  
  // Создаем кнопки (максимум 2 в ряд)
  for (let i = 0; i < wallets.length; i += 2) {
    const row = wallets.slice(i, i + 2).map(wallet => ({
      text: wallet,
      callback_data: `wallet_${wallet}`
    }));
    buttons.push(row);
  }
  
  const replyMarkup = {
    inline_keyboard: buttons
  };
  
  sendMessage(chatId, 'Выберите кошелек:', { reply_markup: replyMarkup });
}

/**
 * Отправляет сводку операции с кнопками подтверждения
 * @param {string|number} chatId - ID чата
 * @param {Object} state - Объект состояния
 */
function sendSummary(chatId, state) {
  const typeText = state.type === 'INCOME' ? 'Доход' : 'Расход';
  const summaryText = `
<b>${typeText} на "${state.itemName}"</b>

Сумма: <code>${state.amount}</code> руб.
Кошелек: <code>${state.wallet}</code>
Комментарий: <code>${state.comment || '—'}</code>
Пользователь: <code>${state.userName}</code>

Подтверждаете запись?
  `.trim();
  
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: 'confirm_yes' },
        { text: '❌ Отменить', callback_data: 'confirm_no' }
      ]
    ]
  };
  
  sendMessage(chatId, summaryText, { reply_markup: replyMarkup });
}

/**
 * Логирует ошибку и отправляет в Telegram
 * @param {string} message - Сообщение об ошибке
 * @param {Error} error - Объект ошибки
 * @param {Object} context - Контекст ошибки
 */
function logError(message, error, context = {}) {
  const errorMessage = `${message}: ${error.message || error}`;
  const stackTrace = error.stack || '';
  const fullContext = JSON.stringify(context, null, 2);
  
  // Логируем в консоль
  console.error(`${CONFIG.LOGGING.ERROR_LOG_PREFIX} ${errorMessage}\n${stackTrace}\nКонтекст: ${fullContext}`);
  
  // Отправляем в лог-бот (если настроен)
  if (CONFIG.TELEGRAM_LOG_BOT_TOKEN && CONFIG.TELEGRAM_LOG_CHAT_ID) {
    try {
      const logText = `
${CONFIG.LOGGING.ERROR_LOG_PREFIX} ${errorMessage}

<b>Стек вызовов:</b>
<pre>${stackTrace.substring(0, 1000)}</pre>

<b>Контекст:</b>
<pre>${fullContext.substring(0, 1000)}</pre>
      `.trim();
      
      const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_LOG_BOT_TOKEN}/sendMessage`;
      const payload = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: CONFIG.TELEGRAM_LOG_CHAT_ID,
          text: logText,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      };
      
      UrlFetchApp.fetch(url, payload);
    } catch (logError) {
      console.error('Ошибка при отправке лога в Telegram:', logError);
    }
  }
}
