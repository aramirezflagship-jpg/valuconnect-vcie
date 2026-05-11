const { google } = require('googleapis');
const fs = require('fs');
const logger = require('./logger');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './config/google-credentials.json';

function getCalendarClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Google credentials not found at ${CREDENTIALS_PATH}. See Section 9.1 of the blueprint.`);
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/calendar'] });
  return google.calendar({ version: 'v3', auth });
}

async function pushPostToCalendar(title, platform, scheduledDate, details) {
  const calendar = getCalendarClient();
  const event = {
    summary: `[VCIE] ${platform}: ${title}`,
    description: details,
    start: { date: scheduledDate },
    end: { date: scheduledDate },
    colorId: platform === 'linkedin' ? '9' : platform === 'instagram' ? '6' : '3'
  };

  const res = await calendar.events.insert({ calendarId: CALENDAR_ID, resource: event });
  logger.info(`Calendar event created: ${res.data.htmlLink}`);
  return res.data;
}

async function syncSchedule(schedule) {
  logger.info(`Calendar sync: pushing ${schedule.length} events`);
  const results = [];
  for (const item of schedule) {
    try {
      const result = await pushPostToCalendar(item.title, item.platform, item.date, item.details);
      results.push(result);
    } catch (err) {
      logger.warn(`Calendar push failed for ${item.title}`, { error: err.message });
    }
  }
  return results;
}

module.exports = { syncSchedule, pushPostToCalendar };
