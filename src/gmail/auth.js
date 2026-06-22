import { google } from 'googleapis';
import 'dotenv/config';

export function getOAuth2Client() {
  const {
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI = 'http://localhost:3000/oauth2callback',
  } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET missing in .env');
  }

  const client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
  if (process.env.GMAIL_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  }
  return client;
}

export function getGmail() {
  return google.gmail({ version: 'v1', auth: getOAuth2Client() });
}
