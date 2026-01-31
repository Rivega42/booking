import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  gog: {
    keyringPassword: process.env.GOG_KEYRING_PASSWORD || '',
  },
  
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  
  booking: {
    ownerName: process.env.OWNER_NAME || 'Owner',
    ownerEmail: process.env.OWNER_EMAIL,
    timezone: process.env.TIMEZONE || 'Europe/Moscow',
    slotDuration: parseInt(process.env.SLOT_DURATION || '30'),
    workingHoursStart: parseInt(process.env.WORKING_HOURS_START || '10'),
    workingHoursEnd: parseInt(process.env.WORKING_HOURS_END || '19'),
    workingDays: (process.env.WORKING_DAYS || '1,2,3,4,5').split(',').map(Number),
    bufferBefore: parseInt(process.env.BUFFER_BEFORE || '0'),
    bufferAfter: parseInt(process.env.BUFFER_AFTER || '15'),
    minNoticeHours: parseInt(process.env.MIN_NOTICE_HOURS || '2'),
    maxDaysAhead: parseInt(process.env.MAX_DAYS_AHEAD || '14'),
  },
};

export default config;
