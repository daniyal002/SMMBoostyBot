const { Bot } = require("grammy");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
require("dotenv").config();
// Токен бота
const botToken = process.env.BOT_TOKEN;

// Инициализация бота
const bot = new Bot(botToken);

// Инициализация Gemini
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Настройки безопасности
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Обработка сообщений
bot.on("message", async (ctx) => {
  const message = ctx.message.text;

  try {
    // Генерация ответа с помощью Gemini
    const result = await model.generateContent(message, { safetySettings });
    const response = await result.response;
    const text = response.text();

    // Проверка ответа на соответствие тематике
    if (isRelevantToMarketingAndSMM(text)) {
      await ctx.reply(text);
    } else {
      await ctx.reply(
        "Я могу отвечать только на вопросы по маркетингу и SMM в Instagram."
      );
    }
  } catch (err) {
    await ctx.reply("Ошибка: " + err.message);
  }
});

// Проверка релевантности ответа
function isRelevantToMarketingAndSMM(text) {
  // Добавьте сюда свою логику проверки
  // Например, можно использовать список ключевых слов
  const keywords = ["маркетинг", "SMM", "Instagram", "таргетинг", "контент"];
  return keywords.some((keyword) => text.includes(keyword));
}

// Запуск бота
bot.start();
