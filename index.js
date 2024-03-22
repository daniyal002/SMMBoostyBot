const { Bot } = require("grammy");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const instruction = `Инструкция для ИИ-ассистента:
Роль: Эксперт в области SMM и маркетинга с акцентом на Instagram.
Основная цель: Предоставлять качественные консультации по вопросам, связанным с маркетингом в социальных сетях и маркетингом в целом.
Обязанности:
Обрабатывать запросы, относящиеся к SMM и маркетингу.
Предоставлять актуальную информацию о последних тенденциях и лучших методах в Instagram.
Общаться с пользователями в дружелюбном и профессиональном тоне.
Предлагать пользователям возможность обратиться к Асии для получения подробной консультации по сложным или углубленным вопросам.
Примеры запросов:
"Как создать эффективную SMM-стратегию?"
"Какие инструменты для анализа социальных сетей наиболее подходят сегодня?"
"Каковы текущие тенденции в контент-маркетинге?"
Пример ответа:
"Чтобы создать эффективную SMM-стратегию, необходимо определить свою целевую аудиторию, установить четкие цели и KPI, выбрать подходящие платформы для публикации и анализа результатов. Регулярно отслеживайте и корректируйте свою стратегию на основе данных аналитики. Если вам нужна более подробная консультация по этому вопросу, вы всегда можете обратиться к Асии".
Заметка:
В конце каждого сообщения добавляйте: "Если вы хотите получить более подробную информацию по этому вопросу, рекомендую обратиться к Асие".`;

// Замените своим токеном Telegram Bot API
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Настройте API OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  beta: { assistants: "v1" }, // Необходимо для API Assistants
});
const openai = new OpenAIApi(configuration);

// Хранилище в памяти для состояния разговора
const conversationStates = {};

// Создайте помощника (замените своими желаемыми инструкциями и моделью)
async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "Math Tutor",
    instructions: instruction,
    tools: [{ type: "code_interpreter" }],
    model: "gpt-3.5-turbo-preview",
  });
  return assistant;
}

// Обработка входящих сообщений
bot.on("message", async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;

  // Извлеките или создайте состояние разговора
  let conversationState = conversationStates[chatId];
  if (!conversationState) {
    conversationState = {
      previousMessages: [],
      assistant: await createAssistant(), // Создайте помощника при первом взаимодействии
    };
    conversationStates[chatId] = conversationState;
  }

  try {
    // Обновите состояние разговора текущим сообщением
    conversationState.previousMessages.push(messageText);

    // Создайте поток
    const thread = await openai.beta.threads.create();

    // Добавьте сообщения в поток
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: conversationState.previousMessages.join("\n"),
    });

    // Запустите помощника в потоке
    const run = openai.beta.threads.runs
      .createAndStream(thread.id, {
        assistant_id: conversationState.assistant.id,
      })
      .on("textCreated", (text) => ctx.reply(text.value))
      .on("textDelta", (textDelta, snapshot) => ctx.reply(textDelta.value))
      .on("toolCallCreated", (toolCall) =>
        ctx.reply(`Assistant is using ${toolCall.type}`)
      )
      .on("toolCallDelta", (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === "code_interpreter") {
          if (toolCallDelta.code_interpreter.input) {
            ctx.reply(toolCallDelta.code_interpreter.input);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            ctx.reply("Output:");
            toolCallDelta.code_interpreter.outputs.forEach((output) => {
              if (output.type === "logs") {
                ctx.reply(output.logs);
              }
            });
          }
        }
      });
  } catch (error) {
    console.error(error);
    ctx.reply("Извините, произошла ошибка.");
  }
});

// Запустите бота
bot.start();
