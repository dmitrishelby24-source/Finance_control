/**
 * Движок диалога. Обрабатывает пользовательский ввод
 * и управляет состоянием диалога.
 */

/**
 * Обрабатывает команду /start
 * @param {string|number} chatId - ID чата
 * @param {string|number} telegramId - Telegram ID пользователя
 */
function handleStartCommand(chatId, telegramId) {
  try {
    // Ищем пользователя в справочнике
    const user = getUserByTelegramId(telegramId);
    
    if (!user) {
      sendMessage(chatId, '🚫 Доступ закрыт. Ваш Telegram ID не найден в системе.');
      logError('Пользователь не найден', new Error(`Telegram ID: ${telegramId}`));
      return;
    }
    
    // Создаем начальное состояние
    const initialState = {
      step: 'MAIN_MENU',
      userName: user.name,
      telegramId: telegramId,
      createdAt: new Date().toISOString()
    };
    
    setBotState(chatId, initialState);
    sendMainMenu(chatId);
    
    if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
      console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Пользователь начал диалог: ${user.name} (${telegramId})`);
    }
    
  } catch (error) {
    logError('Ошибка обработки команды /start:', error, { chatId, telegramId });
    sendMessage(chatId, '⚠️ Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Обрабатывает текстовые сообщения пользователя
 * @param {string|number} chatId - ID чата
 * @param {string} text - Текст сообщения
 * @param {Object} state - Текущее состояние
 */
function handleTextMessage(chatId, text, state) {
  try {
    switch (state.step) {
      case 'MAIN_MENU':
        handleMainMenuChoice(chatId, text, state);
        break;
        
      case 'CATEGORY':
        handleCategoryChoice(chatId, text, state);
        break;
        
      case 'AMOUNT':
        handleAmountInput(chatId, text, state);
        break;
        
      case 'COMMENT':
        handleCommentInput(chatId, text, state);
        break;
        
      default:
        // Если непонятное состояние - сбрасываем
        clearBotState(chatId);
        sendMainMenu(chatId);
    }
  } catch (error) {
    logError('Ошибка обработки текстового сообщения:', error, { chatId, text, state });
    sendMessage(chatId, '⚠️ Произошла ошибка. Пожалуйста, начните заново с /start');
    clearBotState(chatId);
  }
}

/**
 * Обрабатывает выбор в главном меню
 * @param {string|number} chatId - ID чата
 * @param {string} text - Выбранный пункт
 * @param {Object} state - Текущее состояние
 */
function handleMainMenuChoice(chatId, text, state) {
  if (text === CONFIG.BUTTONS.INCOME) {
    // Пользователь выбрал "Доход"
    state.type = 'INCOME';
    state.step = 'ITEM';
    
    // Получаем статьи доходов
    const incomeItems = getFilteredItems(CONFIG.CATEGORY_PREFIXES.INCOME);
    
    if (incomeItems.length === 0) {
      sendMessage(chatId, '⚠️ Статьи доходов не найдены. Обратитесь к администратору.');
      sendMainMenu(chatId);
      return;
    }
    
    setBotState(chatId, state);
    sendItemKeyboard(chatId, incomeItems, 'Выберите статью дохода:');
    
    if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
      console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Выбран доход, доступно статей: ${incomeItems.length}`);
    }
    
  } else if (text === CONFIG.BUTTONS.EXPENSE) {
    // Пользователь выбрал "Расход"
    state.type = 'EXPENSE';
    state.step = 'CATEGORY';
    setBotState(chatId, state);
    sendCategoryMenu(chatId);
    
    if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
      console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Выбран расход`);
    }
    
  } else {
    // Неизвестная команда
    sendMessage(chatId, 'Пожалуйста, выберите "Доход" или "Расход"');
  }
}

/**
 * Обрабатывает выбор категории расходов
 * @param {string|number} chatId - ID чата
 * @param {string} text - Выбранная категория
 * @param {Object} state - Текущее состояние
 */
function handleCategoryChoice(chatId, text, state) {
  // Определяем префикс по выбранной категории
  let prefix = '';
  const categoryIndex = CONFIG.BUTTONS.CATEGORIES.indexOf(text);
  
  switch (categoryIndex) {
    case 0: prefix = CONFIG.CATEGORY_PREFIXES.EXPENSE.OBLIGATORY; break;
    case 1: prefix = CONFIG.CATEGORY_PREFIXES.EXPENSE.NECESSARY; break;
    case 2: prefix = CONFIG.CATEGORY_PREFIXES.EXPENSE.VARIABLE; break;
    case 3: prefix = CONFIG.CATEGORY_PREFIXES.EXPENSE.INVESTMENT; break;
    default:
      sendMessage(chatId, '⚠️ Неизвестная категория. Пожалуйста, выберите из списка.');
      sendCategoryMenu(chatId);
      return;
  }
  
  // Сохраняем выбранную категорию
  state.category = prefix;
  state.step = 'ITEM';
  
  // Получаем статьи расходов для выбранной категории
  const expenseItems = getFilteredItems(prefix);
  
  if (expenseItems.length === 0) {
    sendMessage(chatId, `⚠️ Статьи расходов для категории "${text}" не найдены.`);
    sendMainMenu(chatId);
    return;
  }
  
  setBotState(chatId, state);
  sendItemKeyboard(chatId, expenseItems, `Выберите статью расходов (${text}):`);
  
  if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Выбрана категория: ${text}, доступно статей: ${expenseItems.length}`);
  }
}

/**
 * Обрабатывает ввод суммы
 * @param {string|number} chatId - ID чата
 * @param {string} text - Введенная сумма
 * @param {Object} state - Текущее состояние
 */
function handleAmountInput(chatId, text, state) {
  // Валидируем и нормализуем сумму
  const normalizedText = text
    .replace(/\s+/g, '')      // Удаляем все пробелы
    .replace(/\./g, ',');     // Заменяем точку на запятую
  
  // Проверяем формат: целое число или число с двумя знаками после запятой
  const amountRegex = /^\d+(,\d{1,2})?$/;
  
  if (!amountRegex.test(normalizedText)) {
    sendMessage(chatId, '❌ Неверный формат суммы. Введите число, например: 1254,99');
    return;
  }
  
  // Сохраняем сумму
  state.amount = normalizedText;
  state.step = 'WALLET';
  
  // Получаем список кошельков
  const wallets = getAllWallets();
  
  if (wallets.length === 0) {
    sendMessage(chatId, '⚠️ Кошельки не найдены в справочнике. Обратитесь к администратору.');
    sendMainMenu(chatId);
    return;
  }
  
  setBotState(chatId, state);
  sendWalletKeyboard(chatId, wallets);
  
  if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Введена сумма: ${normalizedText}`);
  }
}

/**
 * Обрабатывает ввод комментария
 * @param {string|number} chatId - ID чата
 * @param {string} text - Введенный комментарий
 * @param {Object} state - Текущее состояние
 */
function handleCommentInput(chatId, text, state) {
  // Сохраняем комментарий (даже если пустой)
  state.comment = text.trim();
  state.step = 'CONFIRM';
  
  setBotState(chatId, state);
  sendSummary(chatId, state);
  
  if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
    console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Введен комментарий: ${text.substring(0, 50)}`);
  }
}

/**
 * Обрабатывает нажатия на inline-кнопки
 * @param {string|number} chatId - ID чата
 * @param {string} callbackData - Данные callback
 * @param {Object} state - Текущее состояние
 * @param {string} messageId - ID сообщения для редактирования
 */
function handleCallbackAction(chatId, callbackData, state, messageId) {
  try {
    if (!state) {
      sendMessage(chatId, '⚠️ Сессия устарела. Начните заново с /start');
      return;
    }
    
    if (callbackData.startsWith('item_')) {
      // Выбор статьи
      const itemCode = callbackData.substring(5);
      const items = getFilteredItems(
        state.type === 'INCOME' 
          ? CONFIG.CATEGORY_PREFIXES.INCOME 
          : state.category
      );
      
      const selectedItem = items.find(item => item.code === itemCode);
      
      if (!selectedItem) {
        sendMessage(chatId, '⚠️ Выбранная статья не найдена. Попробуйте снова.');
        return;
      }
      
      state.itemName = selectedItem.name;
      state.step = 'AMOUNT';
      setBotState(chatId, state);
      sendMessage(chatId, 'Введите сумму:');
      
      if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
        console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Выбрана статья: ${selectedItem.name}`);
      }
      
    } else if (callbackData.startsWith('wallet_')) {
      // Выбор кошелька
      const wallet = callbackData.substring(7);
      state.wallet = wallet;
      state.step = 'COMMENT';
      setBotState(chatId, state);
      sendMessage(chatId, 'Введите комментарий (необязательно):');
      
      if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
        console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Выбран кошелек: ${wallet}`);
      }
      
    } else if (callbackData === 'confirm_yes') {
      // Подтверждение операции
      processRecord(chatId, state);
      
    } else if (callbackData === 'confirm_no') {
      // Отмена операции
      sendMessage(chatId, '❌ Операция отменена.');
      clearBotState(chatId);
      sendMainMenu(chatId);
      
      if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
        console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Операция отменена пользователем`);
      }
      
    } else {
      // Неизвестный callback
      logError('Неизвестный callback', new Error(callbackData), { chatId, state });
    }
    
  } catch (error) {
    logError('Ошибка обработки callback:', error, { chatId, callbackData, state });
    sendMessage(chatId, '⚠️ Произошла ошибка. Пожалуйста, начните заново с /start');
    clearBotState(chatId);
  }
}

/**
 * Обрабатывает финальную запись операции
 * @param {string|number} chatId - ID чата
 * @param {Object} state - Текущее состояние
 */
function processRecord(chatId, state) {
  try {
    // Подготавливаем запись для таблицы
    const record = {
      isIncome: state.type === 'INCOME',
      amount: state.amount,
      itemName: state.itemName,
      wallet: state.wallet,
      comment: state.comment || '',
      userName: state.userName
    };
    
    // Добавляем запись в таблицу
    const success = appendJournalRecord(record);
    
    if (success) {
      sendMessage(chatId, '✅ Запись добавлена!');
      
      if (CONFIG.LOGGING.ENABLE_INFO_LOGS) {
        console.log(`${CONFIG.LOGGING.INFO_LOG_PREFIX} Запись добавлена:`, record);
      }
    } else {
      sendMessage(chatId, '❌ Ошибка при сохранении записи. Попробуйте снова.');
      logError('Ошибка сохранения записи', new Error('appendJournalRecord вернул false'), record);
    }
    
    // Очищаем состояние и показываем главное меню
    clearBotState(chatId);
    sendMainMenu(chatId);
    
  } catch (error) {
    logError('Критическая ошибка при обработке записи:', error, state);
    sendMessage(chatId, '❌ Критическая ошибка при сохранении. Обратитесь к администратору.');
    clearBotState(chatId);
  }
}
