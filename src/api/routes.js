import { Router } from 'express';
import { getAvailableSlots, createEvent } from '../services/calendar.js';
import { notifyNewBooking } from '../services/telegram.js';
import config from '../config/index.js';

const router = Router();

/**
 * GET /api/config - Public booking configuration
 */
router.get('/config', (req, res) => {
  res.json({
    ownerName: config.booking.ownerName,
    timezone: config.booking.timezone,
    slotDuration: config.booking.slotDuration,
    workingHoursStart: config.booking.workingHoursStart,
    workingHoursEnd: config.booking.workingHoursEnd,
    workingDays: config.booking.workingDays,
    maxDaysAhead: config.booking.maxDaysAhead,
  });
});

/**
 * GET /api/slots - Get available time slots
 */
router.get('/slots', async (req, res) => {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.booking.maxDaysAhead);
    
    const slots = await getAvailableSlots(startDate, endDate);
    res.json({ slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

/**
 * POST /api/book - Create a booking
 */
router.post('/book', async (req, res) => {
  try {
    const { name, email, slot, topic } = req.body;
    
    if (!name || !email || !slot) {
      return res.status(400).json({ error: 'Missing required fields: name, email, slot' });
    }
    
    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Parse slot time
    const startTime = new Date(slot);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({ error: 'Invalid slot time' });
    }
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + config.booking.slotDuration);
    
    // Create calendar event
    const event = await createEvent({
      title: topic ? `${topic} - ${name}` : `Встреча с ${name}`,
      description: `Тема: ${topic || 'Не указана'}\n\nЗабронировано через booking.1int.ru`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeEmail: email,
      attendeeName: name,
    });
    
    // Send Telegram notification
    await notifyNewBooking({
      attendeeName: name,
      attendeeEmail: email,
      startTime: startTime.toISOString(),
      topic,
    });
    
    res.json({
      success: true,
      message: 'Встреча успешно забронирована!',
      event: {
        id: event.id,
        link: event.htmlLink,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
