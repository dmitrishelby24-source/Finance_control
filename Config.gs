const CONFIG = {
  // ==================== API КЛЮЧИ ====================
  TELEGRAM_BOT_TOKEN: 'Ваш токен',
  TELEGRAM_LOG_BOT_TOKEN: 'Ваш токен',
  TELEGRAM_LOG_CHAT_ID: 'Ваш ID',

  // ==================== GOOGLE SHEETS ====================
  SPREADSHEET_ID: 'Ващ ID',
  SHEET_NAMES: {
    REFERENCE: 'Справочник',
    JOURNAL: 'Журнал ДДС'
  },

  // ==================== КОНФИГУРАЦИЯ ЛОГИРОВАНИЯ ====================
  LOGGING: {
    ENABLE_INFO_LOGS: true, // В продакшене можно установить false
    INFO_LOG_PREFIX: 'ℹ️ [INFO]',
    ERROR_LOG_PREFIX: '🚨 [ERROR]'
  },

  // ==================== ИНДЕКСЫ СТОЛБЦОВ (A=1, B=2, ...) ====================
  REF_COLS: {
    CODE: 1,        // A - Код статьи (dohod_, rashod1_...)
    TYPE: 2,        // B - Тип статьи (для человека)
    ITEM: 3,        // C - Статья затрат (для кнопок)
    WALLET: 4,      // D - Кошельки (разделитель запятая)
    USER: 5,        // E - Имена пользователей
    TG_ID: 6,       // F - Telegram ID пользователей
    COUNTERPARTY: 7 // G - Контрагент (не используется)
  },

  JRN_COLS: {
    MONTH_PLAN: 1,   // A - План (не заполняется)
    MONTH_FACT: 2,   // B - Месяц оплаты факт (не заполняется)
    DATE_PLAN: 3,    // C - План (не заполняется)
    DATE_FACT: 4,    // D - Дата оплаты факт (сегодня)
    INCOME: 5,       // E - Приход (для доходов)
    EXPENSE: 6,      // F - Расход (для расходов)
    COMMENT: 7,      // G - Комментарий
    ACCOUNT_ITEM: 8, // H - Статья учета (из Справочник!C)
    WALLET: 9,       // I - Кошелек (из Справочник!D)
    USER: 10         // J - Пользователь (из Справочник!E)
  },

  // ==================== ПРЕФИКСЫ КАТЕГОРИЙ ====================
  CATEGORY_PREFIXES: {
    INCOME: 'dohod_',
    EXPENSE: {
      OBLIGATORY: 'rashod1_',     // Обязательные
      NECESSARY: 'rashod2_',      // Необходимые
      VARIABLE: 'rashod3_',       // Переменные
      INVESTMENT: 'rashod4_'      // Инвестиции
    }
  },

  // ==================== ТЕКСТЫ КНОПОК И СООБЩЕНИЙ ====================
  BUTTONS: {
    INCOME: 'Доход',
    EXPENSE: 'Расход',
    CATEGORIES: ['Обязательные', 'Необходимые', 'Переменные', 'Инвестиции']
  },

  // ==================== НАСТРОЙКИ КЭШИРОВАНИЯ ====================
  CACHE_TTL: 300, // 5 минут в секундах
};

/**
 * Утилита для получения объекта таблицы по ID
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} Объект таблицы
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

// Экспортируем конфигурацию для использования в других модулях
if (typeof module !== 'undefined') {
  module.exports = { CONFIG, getSpreadsheet };
}

// Добавьте в конец Config.gs
function testLogging() {
  console.log('=== ТЕСТ ЛОГИРОВАНИЯ ===');
  
  // Тест обычного лога
  console.log('Тест INFO лога');
  
  // Тест ошибки (должна отправиться в лог-бот)
  try {
    throw new Error('Тестовая ошибка для проверки логов');
  } catch (e) {
    logError('Тестовая ошибка', e, { test: true, time: new Date() });
  }
  
  console.log('=== ТЕСТ ЗАВЕРШЕН ===');
}
