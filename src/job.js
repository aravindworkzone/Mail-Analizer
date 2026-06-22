import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { fetchThreads } from './gmail/fetch.js';
import { analyzeThreads, summarizeContext } from './analyze/grok.js';
import { webSearch } from './search/serper.js';
import { appendToInbox } from './notion/write.js';
import { getLastRun, setLastRun } from './util/state.js';
import { log } from './util/logger.js';

const CATEGORY_ORDER = ['Urgent', 'Action Needed', 'Can Delete'];

// One capture line per email thread.
function buildLine(it) {
  let line = `[${it.category}] ${it.summary}`;
  if (it.webContext) line += ` (ctx: ${it.webContext})`;
  if (it.flag) line += ` ⚠ ${it.flag}`;
  return line;
}

export async function runDailyJob() {
  const startedAt = Date.now();
  const lastRun = getLastRun();
  log(`Scanning Primary unread ${lastRun ? `since ${new Date(lastRun).toISOString()}` : '(last 24h)'} ...`);

  const threads = await fetchThreads({ after: lastRun });
  if (threads.length === 0) {
    log('Inbox clear — no new unread Primary mail since last run. (Nothing appended.)');
    setLastRun(startedAt);
    return { count: 0 };
  }
  log(`Found ${threads.length} thread(s). Analyzing with Grok ...`);

  const analysis = await analyzeThreads(threads);
  const byId = Object.fromEntries(threads.map((t) => [t.threadId, t]));
  let items = analysis
    .filter((a) => byId[a.threadId])
    .map((a) => ({ ...byId[a.threadId], ...a, webContext: '' }));

  // Selective web context — only items the model flagged, with a sanitized query.
  const toSearch = items.filter((i) => i.needsSearch && i.searchQuery);
  if (toSearch.length) {
    log(`Fetching web context for ${toSearch.length} item(s) ...`);
    const lookups = [];
    for (const it of toSearch) {
      try {
        const results = await webSearch(it.searchQuery);
        lookups.push({ threadId: it.threadId, query: it.searchQuery, results });
      } catch (err) {
        log(`Search failed for "${it.searchQuery}": ${err.message}`);
      }
    }
    const ctx = await summarizeContext(lookups);
    items = items.map((i) => (ctx[i.threadId] ? { ...i, webContext: ctx[i.threadId] } : i));
  }

  // Urgent first, then Action Needed, then Can Delete.
  items.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const header = `— daily email ${new Date().toISOString().slice(0, 10)} (${items.length} item${items.length === 1 ? '' : 's'}) —`;
  const lines = [header, ...items.map(buildLine)];

  console.log('\n' + lines.join('\n') + '\n');

  log('Appending to 📥 Inbox page ...');
  await appendToInbox(process.env.NOTION_INBOX_PAGE_ID, lines);

  setLastRun(startedAt);
  log('Done.');
  return { count: items.length };
}

// Allow `npm run daily` to invoke a single run directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDailyJob().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
