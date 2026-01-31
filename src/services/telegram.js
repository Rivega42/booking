import TelegramBot from 'node-telegram-bot-api';
import config from '../config/index.js';

let bot = null;

if (config.telegram.botToken && config.telegram.chatId) {
  bot = new TelegramBot(config.telegram.botToken);
}

/**
 * Send notification about new booking
 */
export async function notifyNewBooking({ attendeeName, attendeeEmail, startTime, title, topic }) {
  if (!bot) {
    console.log('Telegram not configured, skipping notification');
    return;
  }
  
  const date = new Date(startTime).toLocaleString('ru-RU', {
    timeZone: config.booking.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const message = `📅 *Новая запись!*

👤 *Имя:* ${escapeMarkdown(attendeeName)}
📧 *Email:* ${escapeMarkdown(attendeeEmail)}
📝 *Тема:* ${escapeMarkdown(topic || 'Не указана')}
🕐 *Время:* ${escapeMarkdown(date)}
⏱ *Длительность:* ${config.booking.slotDuration} мин`;

  try {
    await bot.sendMessage(config.telegram.chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
  }
}

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export default { notifyNewBooking };
