import { getGmail } from './auth.js';

const decode = (data) => Buffer.from(data, 'base64url').toString('utf8');

// Walk the MIME tree, preferring text/plain, falling back to stripped HTML.
function extractBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decode(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decode(payload.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }
  return '';
}

// Scan unread Primary mail and collapse to one item per thread.
export async function fetchThreads({ after } = {}) {
  const gmail = getGmail();

  let q = 'category:primary is:unread';
  q += after ? ` after:${Math.floor(after / 1000)}` : ' newer_than:1d';

  const messages = [];
  let pageToken;
  do {
    const { data } = await gmail.users.messages.list({ userId: 'me', q, pageToken, maxResults: 100 });
    (data.messages || []).forEach((m) => messages.push(m));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const threadIds = [...new Set(messages.map((m) => m.threadId))];
  const items = [];

  for (const threadId of threadIds) {
    const { data: thread } = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const msgs = thread.messages || [];
    const last = msgs[msgs.length - 1];
    const headers = Object.fromEntries(
      (last.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]),
    );
    const body = msgs
      .map((m) => extractBody(m.payload))
      .filter(Boolean)
      .join('\n---\n')
      .slice(0, 4000);

    items.push({
      threadId,
      subject: headers.subject || '(no subject)',
      from: headers.from || '',
      date: headers.date || '',
      snippet: last.snippet || '',
      body: body || last.snippet || '',
      messageCount: msgs.length,
      link: `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
    });
  }

  return items;
}
