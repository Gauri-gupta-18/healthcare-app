const express = require('express');
const { google } = require('googleapis');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Init OAuth flow
router.get('/init', authenticate, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: req.user.id.toString(), // Pass user ID through state
  });
  res.json({ url });
});

// OAuth Callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // We passed user ID in state

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // In a real app, save tokens to user's profile in DB
    // await db.query('UPDATE users SET google_tokens = $1 WHERE id = $2', [JSON.stringify(tokens), userId]);
    
    // For now just return success
    res.send('Calendar connected successfully. You can close this window.');
  } catch (error) {
    console.error('Error in Google Calendar OAuth callback:', error);
    res.status(500).send('Failed to connect to Google Calendar.');
  }
});

module.exports = router;
