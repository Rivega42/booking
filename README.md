# 📅 Booking

Self-hosted booking/scheduling system like cal.com.

## Features

- 📅 Google Calendar integration
- 🔔 Telegram notifications
- 📱 Mobile-friendly UI
- 🐳 Docker support
- ⚙️ Fully configurable via ENV

## Quick Start

### 1. Setup Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Desktop app)
3. Enable Google Calendar API
4. Get refresh token using `gog auth add` or OAuth playground

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run

**With Node.js:**
```bash
npm install
npm start
```

**With Docker:**
```bash
docker-compose up -d
```

### 4. Setup Nginx (optional)

```nginx
server {
    server_name booking.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `BASE_URL` | Public URL | http://localhost:3000 |
| `GOOGLE_CLIENT_ID` | OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | - |
| `GOOGLE_REFRESH_TOKEN` | OAuth refresh token | - |
| `GOOGLE_CALENDAR_ID` | Calendar ID | primary |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications | - |
| `TELEGRAM_CHAT_ID` | Chat ID for notifications | - |
| `OWNER_NAME` | Your name (shown on page) | Owner |
| `OWNER_EMAIL` | Your email | - |
| `TIMEZONE` | Timezone | Europe/Moscow |
| `SLOT_DURATION` | Slot length in minutes | 30 |
| `WORKING_HOURS_START` | Start of working day | 10 |
| `WORKING_HOURS_END` | End of working day | 19 |
| `WORKING_DAYS` | Working days (1=Mon, 7=Sun) | 1,2,3,4,5 |
| `MIN_NOTICE_HOURS` | Minimum hours before booking | 2 |
| `MAX_DAYS_AHEAD` | Max days to show | 14 |

## API

### GET /api/config
Returns public booking configuration.

### GET /api/slots
Returns available time slots.

### POST /api/book
Create a booking.

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "topic": "Consultation",
  "slot": "2024-01-15T10:00:00.000Z"
}
```

## License

MIT
