// Verify the app can reach the 📥 Inbox page. Run: npm run check:notion
import 'dotenv/config';
import { notion } from './client.js';

const pageId = process.env.NOTION_INBOX_PAGE_ID;
if (!pageId) {
  console.error('Set NOTION_INBOX_PAGE_ID in .env (📥 Inbox page id).');
  process.exit(1);
}

const page = await notion.pages.retrieve({ page_id: pageId });
const titleProp = Object.values(page.properties || {}).find((p) => p.type === 'title');
const title = titleProp?.title?.map((t) => t.plain_text).join('') || '(untitled)';

console.log('Connected to page:', title);
console.log('OK — daily results will be appended here, one line per item.');
