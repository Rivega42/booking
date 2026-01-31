import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';

const execAsync = promisify(exec);

const CALENDAR_ID = config.booking.ownerEmail;

async function runGog(args) {
  const cmd = `GOG_KEYRING_PASSWORD="${process.env.GOG_KEYRING_PASSWORD || ''}" gog ${args}`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

/**
 * Get events from Google Calendar
 */
export async function getEvents(startDate, endDate) {
  try {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const result = await runGog(
      `calendar events ${CALENDAR_ID} --from "${start}" --to "${end}" --max 200 --json`
    );
    return result.events || [];
  } catch (error) {
    console.error('Failed to get events:', error.message);
    return [];
  }
}

/**
 * Generate available slots for a date range
 */
export async function getAvailableSlots(startDate, endDate) {
  const events = await getEvents(startDate, endDate);
  const slots = [];

  const busyTimes = events.map(event => ({
    start: new Date(event.start?.dateTime || event.start?.date || event.start),
    end: new Date(event.end?.dateTime || event.end?.date || event.end),
  }));

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const dayOfWeek = current.getDay();
    const configDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    if (config.booking.workingDays.includes(configDay)) {
      for (let hour = config.booking.workingHoursStart; hour < config.booking.workingHoursEnd; hour++) {
        for (let minute = 0; minute < 60; minute += config.booking.slotDuration) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + config.booking.slotDuration);

          // Minimum notice
          const minNotice = new Date();
          minNotice.setHours(minNotice.getHours() + config.booking.minNoticeHours);
          if (slotStart < minNotice) continue;

          // Check conflicts
          const isConflict = busyTimes.some(busy => {
            const bs = new Date(busy.start);
            const be = new Date(busy.end);
            bs.setMinutes(bs.getMinutes() - config.booking.bufferBefore);
            be.setMinutes(be.getMinutes() + config.booking.bufferAfter);
            return slotStart < be && slotEnd > bs;
          });

          if (!isConflict) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return slots;
}

/**
 * Create a calendar event (safe shell escaping)
 */
export async function createEvent({ title, description, startTime, endTime, attendeeEmail, attendeeName }) {
  // Sanitize inputs for shell
  const safeTitle = title.replace(/["`$\\]/g, '');
  const safeDesc = description.replace(/["`$\\]/g, '').replace(/\n/g, ' | ');
  const start = new Date(startTime).toISOString();
  const end = new Date(endTime).toISOString();

  const args = [
    `calendar create ${CALENDAR_ID}`,
    `--summary "${safeTitle}"`,
    `--from "${start}"`,
    `--to "${end}"`,
    `--description "${safeDesc}"`,
    attendeeEmail ? `--attendees "${attendeeEmail}"` : '',
    '--json',
  ].filter(Boolean).join(' ');

  const result = await runGog(args);
  return result;
}

export default { getEvents, getAvailableSlots, createEvent };
