import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';

const execAsync = promisify(exec);

// GOG CLI wrapper - uses installed gogcli with keyring
const GOG_ENV = `GOG_KEYRING_PASSWORD="${process.env.GOG_KEYRING_PASSWORD || 'openclaw123'}"`;

async function runGog(command) {
  const { stdout, stderr } = await execAsync(`${GOG_ENV} gog ${command} --json`);
  if (stderr) console.error('gog stderr:', stderr);
  return JSON.parse(stdout);
}

/**
 * Get events from Google Calendar
 */
export async function getEvents(startDate, endDate) {
  try {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const result = await runGog(`calendar events list --from "${start}" --to "${end}" --max 100`);
    return result.events || result || [];
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
  
  // Convert events to busy times
  const busyTimes = events.map(event => ({
    start: new Date(event.start?.dateTime || event.start?.date || event.start),
    end: new Date(event.end?.dateTime || event.end?.date || event.end),
  }));
  
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current < end) {
    const dayOfWeek = current.getDay();
    // Convert JS day (0=Sun) to config format (1=Mon...7=Sun)
    const configDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    if (config.booking.workingDays.includes(configDay)) {
      for (let hour = config.booking.workingHoursStart; hour < config.booking.workingHoursEnd; hour++) {
        for (let minute = 0; minute < 60; minute += config.booking.slotDuration) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + config.booking.slotDuration);
          
          // Check minimum notice
          const minNotice = new Date();
          minNotice.setHours(minNotice.getHours() + config.booking.minNoticeHours);
          if (slotStart < minNotice) continue;
          
          // Check conflicts with buffers
          const isConflict = busyTimes.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            busyStart.setMinutes(busyStart.getMinutes() - config.booking.bufferBefore);
            busyEnd.setMinutes(busyEnd.getMinutes() + config.booking.bufferAfter);
            return slotStart < busyEnd && slotEnd > busyStart;
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
 * Create a calendar event
 */
export async function createEvent({ title, description, startTime, endTime, attendeeEmail, attendeeName }) {
  try {
    const start = new Date(startTime).toISOString();
    const end = new Date(endTime).toISOString();
    
    const result = await runGog(
      `calendar events create "${title}" --from "${start}" --to "${end}" --description "${description.replace(/"/g, '\\"')}"`
    );
    
    return result;
  } catch (error) {
    console.error('Failed to create event:', error.message);
    throw error;
  }
}

export default { getEvents, getAvailableSlots, createEvent };
