import { notion } from './client.js';

// A plain-text paragraph block (one capture line per item — honors the Inbox "no formatting" rule).
const para = (line) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: [{ type: 'text', text: { content: String(line).slice(0, 1990) } }] },
});

// Appends lines to the 📥 Inbox page. Append-only — never edits or removes existing content.
export async function appendToInbox(pageId, lines) {
  if (!pageId) throw new Error('NOTION_INBOX_PAGE_ID not set (📥 Inbox page id).');
  if (!lines.length) return 0;

  // Notion allows at most 100 child blocks per request.
  for (let i = 0; i < lines.length; i += 100) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: lines.slice(i, i + 100).map(para),
    });
  }
  return lines.length;
}
