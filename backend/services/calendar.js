const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Note: In a real app, tokens should be stored per user (Doctor/Patient) in DB.
// For simplicity we assume setting credentials when needed.

async function createEvent(tokens, eventDetails) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: 'UTC',
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    return res.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

async function updateEvent(tokens, eventId, eventDetails) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: 'UTC',
      },
    };

    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });
    
    return res.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

async function deleteEvent(tokens, eventId) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent
};
