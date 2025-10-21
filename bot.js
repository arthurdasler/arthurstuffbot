// Импорт библиотек
import TelegramBot from 'node-telegram-bot-api';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

// ----------- Конфиг Firebase -------------
const firebaseConfig = {
  apiKey: "AIzaSyAM7lLohh7L2Y5z_-cl33Vm4lcTibzgIm4",
  authDomain: "arthurstuff-dae5b.firebaseapp.com",
  databaseURL: "https://arthurstuff-dae5b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "arthurstuff-dae5b",
  storageBucket: "arthurstuff-dae5b.appspot.com",
  messagingSenderId: "536755331219",
  appId: "1:536755331219:web:232bb38b18590ce8756d66"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------- Конфиг Telegram -------------
const token = process.env.BOT_TOKEN || "7306466390:AAHZ8QmWTeiR99HHSQAGsrlFqcllc8ZaMdg";
const bot = new TelegramBot(token, { polling: true });

console.log("Бот запущен ✅");

// ----------- Хранилище состояния пользователей -------------
const users = {}; // chatId => { awaitingCode: boolean }

// ----------- Главное меню -------------
const mainMenu = [
  [{ text: "Верификация" }],
  [{ text: "Сотрудничество" }],
  [{ text: "Каталог" }]
];


// ----------- Стартовая команда ---------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Сбрасываем старые состояния
  if (users[chatId]) delete users[chatId];

  // Отправляем стартовое фото с меню
  await bot.sendPhoto(chatId, "https://ik.imagekit.io/borsokov/TG-Bot/1.png", {
    reply_markup: {
      keyboard: mainMenu,
      resize_keyboard: true
    }
  });
});

// ----------- Обработчик всех сообщений -------------
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : "";

  if (!text || text.startsWith('/')) return; // игнорируем команды здесь

  // --- Главное меню ---
  if (text === "Верификация") {
    users[chatId] = { awaitingCode: true };

    await bot.sendPhoto(chatId, "https://ik.imagekit.io/borsokov/TG-Bot/2.png", {
      reply_markup: {
        keyboard: [[{ text: "Назад" }]],
        resize_keyboard: true
      }
    });
    return;
  }

  if (text === "Сотрудничество") {
    await bot.sendMessage(chatId,
      "Ссылки для сотрудничества:\n" +
      "📧 Почта отдела: arthurdasler@gmail.com\n" +
      "🔗 Написать в телеграм: @arthurborsokov\n"
    );
    return;
  }

  if (text === "Каталог") {
    await bot.sendPhoto(chatId, "https://ik.imagekit.io/borsokov/TG-Bot/3.png", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть каталог",
              web_app: { url: "https://arthurstuff.ru" } // твой домен
            }
          ]
        ]
      }
    });
    return;
  }

  // --- Кнопка "Назад" из меню верификации ---
  if (text === "Назад" && users[chatId] && users[chatId].awaitingCode) {
    delete users[chatId];
    await bot.sendPhoto(chatId, "https://ik.imagekit.io/borsokov/TG-Bot/1.png", {
      reply_markup: {
        keyboard: mainMenu,
        resize_keyboard: true
      }
    });
    return;
  }

  // --- Проверка кода (регистронезависимо) ---
  if (users[chatId] && users[chatId].awaitingCode) {
    const code = text.toLowerCase();

    try {
      const codeRef = ref(db, 'codes/' + code);
      const snapshot = await get(codeRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        await bot.sendMessage(chatId,
          `✅ Коллекция: ${data.dropName || 'Нет информации'}\n` +
          `Предназначено: ${data.assignedTo || 'Нет информации'}\n` +
          `Номер: ${data.individualNumber || 'Нет информации'}`
        );
      } else {
        await bot.sendMessage(chatId, "❌ Такого номера не существует");
      }
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "⚠️ Ошибка запроса к Firebase");
    }

    // Пользователь остаётся в подменю
    await bot.sendMessage(chatId, "Введите следующий код или нажмите 'Назад' для выхода:", {
      reply_markup: {
        keyboard: [[{ text: "Назад" }]],
        resize_keyboard: true
      }
    });
    return;
  }
});