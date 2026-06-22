// One-time OAuth consent. Run: npm run authorize
import http from 'node:http';
import 'dotenv/config';
import { getOAuth2Client } from './auth.js';

// Read-only: the analyzer never modifies or deletes mail.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const client = getOAuth2Client();
const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n1. Open this URL in your browser and approve access:\n\n' + authUrl + '\n');

const server = http
  .createServer(async (req, res) => {
    if (!req.url.startsWith('/oauth2callback')) {
      res.writeHead(404).end();
      return;
    }
    const code = new URL(req.url, 'http://localhost:3000').searchParams.get('code');
    try {
      const { tokens } = await client.getToken(code);
      res.end('Authorized. You can close this tab and return to the terminal.');
      if (tokens.refresh_token) {
        console.log('\n2. Add this line to your .env:\n\nGMAIL_REFRESH_TOKEN=' + tokens.refresh_token + '\n');
      } else {
        console.log('\nNo refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and retry.');
      }
    } catch (err) {
      res.end('Token exchange failed: ' + err.message);
      console.error(err);
    } finally {
      server.close();
    }
  })
  .listen(3000, () => console.log('Waiting for the Google redirect on http://localhost:3000 ...'));
