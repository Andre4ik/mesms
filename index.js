const axios = require('axios');
const { Telegraf, Markup } = require('telegraf');
const { exec } = require('child_process');
const fs = require('fs');
// Ваш токен бота
const token = '6517345143:AAG1Y-9HFLDc52AmjrsPPkE7ruzECW6dSIM';
const bot = new Telegraf(token);

// Створіть масив для зберігання раніше введених міст
const previousCities = {};

// Створіть об'єкт для зберігання вибраних мов користувачами
const userLanguages = {};

// Обробник команди /start
bot.start((ctx) => {
  const username = ctx.from.username;
  const userId = ctx.from.id;
  userLanguages[userId] = 'uk'; // Встановлюємо мову користувача за замовчуванням
  ctx.reply(`Привіт, ${username}! Я бот погоди. Виберіть мову за допомогою кнопок нижче.`, {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🇺🇦 Українська', 'uk')],
      [Markup.button.callback('🇬🇧 Англійська', 'en')],
    ])
  });
});

// Обробник команди /previous_cities
bot.command('previous_cities', (ctx) => {
  const userId = ctx.from.id;
  const previousCitiesForUser = previousCities[userId] || [];

  if (previousCitiesForUser.length > 0) {
    let message = `<b>Ваші попередні введені міста:</b>`;
    for (let i = 0; i < Math.min(previousCitiesForUser.length, 5); i++) {
      message += `\n- ${previousCitiesForUser[i]}`;
    }
    ctx.replyWithHTML(message);
  } else {
    const language = userLanguages[ctx.from.id] || 'uk';
    const text = language === 'uk' ? 'Ви ще не вводили міста.' : 'You have not entered any cities yet.';
    ctx.reply(text);
  }
});

// Обробник текстових повідомлень
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const language = userLanguages[userId] || 'uk';
  const city = ctx.message.text;
  const apiKey = '17d6a1fddd58be958053677f785d2c2b';
  const apiUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    const weatherData = response.data;
    const forecasts = weatherData.list;

    // Збережіть місто в масиві previousCities
    if (!previousCities[ctx.message.from.id]) {
      previousCities[ctx.message.from.id] = [];
    }
    previousCities[ctx.message.from.id].unshift(city);
    if (previousCities[ctx.message.from.id].length > 5) {
      previousCities[ctx.message.from.id].pop();
    }

    const today = new Date();
    const dailyForecasts = forecasts.filter(forecast => {
      const date = new Date(forecast.dt_txt);
      return date.getDate() === today.getDate();
    });

    let message = `<b>Прогноз погоди в ${city} на сьогодні 📰</b>`;

    dailyForecasts.forEach(forecast => {
      const temperature = Math.round(forecast.main.temp - 273.15);
      const description = translateWeatherDescription(forecast.weather[0].description, language);
      const time = new Date(forecast.dt_txt).toLocaleTimeString('ua-UA', { hour: '2-digit', minute: '2-digit' });

      message += `\n- ${time} - ${description}, \n Температура: ${temperature}°C 🌡️`;
    });

    // Відправте іконку погоди у вигляді GIF
    const gifUrl = 'https://i.gifer.com/68J.gif'; // Замініть це посилання на своє посилання GIF
    await ctx.replyWithAnimation(gifUrl);

    ctx.replyWithHTML(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: getLocalizedText('Показати погоду на наступний день', language), callback_data: 'next_day_forecast' }],
          [{ text: getLocalizedText('Попередні міста', language), callback_data: 'show_previous_cities' }]
        ]
      }
    });
  } catch (error) {
    console.error('Помилка отримання даних про погоду:', error);
    ctx.reply(getLocalizedText('Виникла помилка при отриманні даних про погоду на сьогодні для вказаного міста.', language));
  }
});

// Функція для перекладу англійського опису погоди на українську або будь-яку іншу мову
function translateWeatherDescription(description, language) {
  switch (description) {
    case 'clear sky':
      return language === 'uk' ? '🌞 Ясне небо' : '🌞 Clear sky';
    case 'few clouds':
      return language === 'uk' ? '🌤️ Невелика хмарність' : '🌤️ Few clouds';
    case 'scattered clouds':
      return language === 'uk' ? '⛅ Хмарно з проясненнями' : '⛅ Scattered clouds';
    case 'broken clouds':
      return language === 'uk' ? '☁️ Хмарно' : '☁️ Broken clouds';
    case 'shower rain':
      return language === 'uk' ? '🌧️ Злива' : '🌧️ Shower rain';
    case 'rain':
      return language === 'uk' ? '🌧️ Дощ' : '🌧️ Rain';
    case 'thunderstorm':
      return language === 'uk' ? '⛈️ Гроза' : '⛈️ Thunderstorm';
    case 'snow':
      return language === 'uk' ? '❄️ Сніг' : '❄️ Snow';
    case 'mist':
      return language === 'uk' ? '🌫️ Туман' : '🌫️ Mist';
    case 'light rain':
      return language === 'uk' ? '🌦️ Легкий дощ' : '🌦️ Light rain';
    case 'overcast clouds':
      return language === 'uk' ? '☁️ Похмурі хмари' : '☁️ Overcast clouds';
    default:
      return description;
  }
}

// Функція для отримання локалізованого тексту
function getLocalizedText(text, language) {
  if (language === 'uk') {
    return text;
  } else if (language === 'en') {
    // Ви можете додати інші мови тут
    // Наприклад, для англійської мови повертається оригінальний текст
    return text;
  } else {
    return text;
  }
}

// Запуск бота
bot.launch();

// Додайте обробник помилок
bot.catch((err) => {
  console.error('Помилка:', err);
});

// Обробник події натискання кнопки "Вибрати мову"
bot.action(/(uk|en)/, (ctx) => {
  const language = ctx.match[0];
  userLanguages[ctx.from.id] = language;
  const text = language === 'uk' ? 'Мову бота встановлено на українську.' : 'Bot language set to English.';
  ctx.reply(text);
});
// Обробник події натискання кнопки "Показати погоду на наступний день"
bot.action('next_day_forecast', async (ctx) => {
  ctx.reply(getLocalizedText('Будь ласка, вкажіть місто, для якого ви хочете побачити прогноз погоди на наступний день.', userLanguages[ctx.from.id]));
});

// Обробник події натискання кнопки "Попередні міста"
bot.action('show_previous_cities', async (ctx) => {
  const userId = ctx.from.id;
  const previousCitiesForUser = previousCities[userId] || [];
  const language = userLanguages[userId] || 'uk';

  if (previousCitiesForUser.length > 0) {
    let message = `<b>Ваші попередні введені міста:</b>`;
    for (let i = 0; i < Math.min(previousCitiesForUser.length, 5); i++) {
      message += `\n- ${previousCitiesForUser[i]}`;
    }
    ctx.replyWithHTML(message);
  } else {
    const text = language === 'uk' ? 'Ви ще не вводили міста.' : 'You have not entered any cities yet.';
    ctx.reply(text);
  }
});

// Обробник події натискання кнопки для певного міста
bot.action(/.*/, async (ctx) => {
  const city = ctx.match[0];
  const language = userLanguages[ctx.from.id] || 'uk';
  const apiKey = '17d6a1fddd58be958053677f785d2c2b';
  const apiUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    const weatherData = response.data;
    const forecasts = weatherData.list;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowForecasts = forecasts.filter(forecast => {
      const date = new Date(forecast.dt_txt);
      return date.getDate() === tomorrow.getDate();
    });

    let message = `<b>Прогноз погоди в ${city} на ${tomorrow.toLocaleDateString('ua-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}📰:</b>`;

    tomorrowForecasts.forEach(forecast => {
      const temperature = Math.round(forecast.main.temp - 273.15);
      const description = translateWeatherDescription(forecast.weather[0].description, language);
      const time = new Date(forecast.dt_txt).toLocaleTimeString('ua-UA', { hour: '2-digit', minute: '2-digit' });

      message += `\n- ${time} - ${description}, Температура: ${temperature}°C`;
    });

    ctx.replyWithHTML(message);
  } catch (error) {
    console.error('Помилка отримання даних про погоду:', error);
    ctx.reply(getLocalizedText('Виникла помилка при отриманні даних про погоду на наступний день для вказаного міста.', language));
  }
});
bot.catch((err) => {
  console.error('Помилка:', err);
});
// Щоб бот працював постійно
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));