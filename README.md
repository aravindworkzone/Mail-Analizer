# Mail Analyzer

Automated daily Gmail triage that **dumps results into the 📥 Inbox page** (under 🏠 Life HQ).

On a schedule it scans **unread Primary** mail from the last 24h (or since the last run),
groups each conversation into one item, and uses **Grok (xAI)** to categorize + summarize.
For items that name a company / recruiter / product it pulls **one line of web context** via
**Serper.dev**, then appends everything to the 📥 Inbox page — one line per item, Urgent first.

```
Gmail (unread Primary)
   → group by thread
   → Grok: categorize (Urgent / Action Needed / Can Delete) + summarize
   → Serper.dev (only flagged items, sanitized query)
   → append capture lines to 📥 Inbox page
```

Each appended line looks like:

```
— daily email 2026-06-22 (3 items) —
[Urgent] Recruiter wants a call today about a backend role. (ctx: Product co., ~50 staff, Coimbatore)
[Action Needed] Client asks for the revised invoice.
[Can Delete] Weekly newsletter from X. ⚠ CHECK BEFORE DELETE
```

## How it works

The whole pipeline lives in [`src/job.js`](src/job.js) (`runDailyJob`). One run is:

```
Gmail (unread Primary)
      │  src/gmail/fetch.js — page results, collapse to one item per thread
      ▼
LLM triage  (src/analyze/grok.js)
      │  per thread: category + summary + optional flag + "needs web search?"
      ▼
Web search for flagged items only  (src/search/serper.js → Serper/Google)
      │  raw results → LLM condenses each to one context line
      ▼
sort  Urgent ▸ Action Needed ▸ Can Delete
      ▼
append digest to Notion 📥 Inbox  (src/notion/write.js, append-only)
```

1. **Fetch** — [`src/gmail/fetch.js`](src/gmail/fetch.js) queries `category:primary is:unread`
   over a time window, pages through every match, and collapses messages to **one item per
   thread**. It walks the MIME tree (prefers `text/plain`, falls back to stripped HTML) and
   keeps up to ~4000 chars of body. The window is `after:<lastRun>` if a prior run is
   recorded, else `newer_than:1d`.
2. **Analyze** — [`src/analyze/grok.js`](src/analyze/grok.js) calls an OpenAI-compatible
   Chat Completions endpoint in JSON mode. Per thread it returns a category, a summary, an
   optional flag, and whether the item needs a web lookup (with a sanitized query).
3. **Web context (selective)** — only flagged items are searched, so search usage stays low.
   Results go back to the model, which condenses each to a single line.
4. **Compose & sort** — ordered Urgent → Action Needed → Can Delete, one line each:
   `[Category] summary (ctx: web context) ⚠ flag`.
5. **Write** — [`src/notion/write.js`](src/notion/write.js) appends the dated digest as
   plain paragraph blocks (batched at Notion's 100-blocks-per-request limit).

### State / dedup
[`src/util/state.js`](src/util/state.js) records the last successful run in `data/state.json`
so the next run only scans newer mail.

> **On GitHub Actions this file does not persist** — runners are ephemeral, so each run
> starts fresh and falls back to the `newer_than:1d` window. For a once-a-day schedule
> that's exactly right. Persist `data/state.json` (cache/artifact) only if you run more
> than once a day and need strict dedup.

### Running — local vs GitHub Actions
The work is identical; only the trigger differs. There is a single entry point,
[`src/job.js`](src/job.js) — one run, then exit. No long-running daemon.

| | Command | Trigger | Config from |
|---|---|---|---|
| **GitHub Actions** (production) | `node src/job.js` | `.github/workflows/daily.yml` cron + manual **Run workflow** | repo **Secrets** + workflow `env` |
| **Local** (dev/testing) | `npm run daily` | you, on demand | `.env` |

The scheduling lives entirely in the GitHub Actions workflow — there is no in-process
cron. To change when it runs, edit the `cron:` line in `daily.yml`.

## Output target
- Page: **📥 Inbox** — `37c8a8e8-7f1f-81ee-aa8e-cc694564749b`
- **Append-only.** The app only adds new lines; it never edits or removes existing content.
- Empty inbox → logged to the console, nothing appended (keeps the capture page clean).

## Categories
- **Urgent** — deadline today/tomorrow, or sender expects a same-day reply.
- **Action Needed** — needs a reply/task from you, no hard time pressure.
- **Can Delete** — newsletters, promos, automated/no-reply noise. *(Label only — nothing is ever deleted.)*

Promo-looking mail that may matter (receipt, OTP, alert, personal note) is flagged
**CHECK BEFORE DELETE**.

## Privacy
- Mail body is sent to Grok only for categorization/summary.
- Search queries use **public entity names only**; personal, financial, medical, or private
  content is never put into a query.
- Read-only Gmail scope — the app cannot modify or delete your mail.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

### 1. Gmail (OAuth)
1. In [Google Cloud Console](https://console.cloud.google.com/): enable the **Gmail API**.
2. Create an OAuth **Web application** client; add redirect URI `http://localhost:3000/oauth2callback`.
3. Put `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` in `.env`.
4. Run `npm run authorize`, approve in the browser, paste the printed `GMAIL_REFRESH_TOKEN`.

### 2. Groq
Put your Groq key (`gsk_…`) in `GROQ_API_KEY`. Defaults: `GROQ_BASE_URL=https://api.groq.com/openai/v1`,
`GROQ_MODEL=llama-3.3-70b-versatile` (supports JSON mode). Override the model with `GROQ_MODEL`.
The code just talks to any OpenAI-compatible Chat Completions API, so you can point
`GROQ_BASE_URL` / `GROQ_MODEL` at Groq, x.ai/Grok, or another provider.

### 3. Serper.dev
Sign up at [serper.dev](https://serper.dev), copy your API key → `SERPER_API_KEY`.

### 4. Notion
1. Create an internal integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
   → `NOTION_TOKEN`.
2. Open **📥 Inbox** in Notion → ••• → **Connections** → add your integration.
3. `NOTION_INBOX_PAGE_ID` is already set in `.env.example`. Verify access:

```bash
npm run check:notion
```

## Run

```bash
npm run daily    # run the pipeline once and exit
```

In production you don't run this yourself — GitHub Actions does, on schedule. `npm run
daily` is for testing locally against your `.env`.

State (`data/state.json`) tracks the last run so a local scan only covers new mail. On
GitHub Actions this file doesn't persist between runs (see **State / dedup** above).

## Deploy on GitHub Actions

The intended production setup — **no server or Vercel needed.** GitHub's scheduler is the
cron, and each run executes `node src/job.js`.

1. Add each `.env` value as a **repository secret** (Settings → Secrets and variables →
   Actions): `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
   `GROQ_API_KEY`, `SERPER_API_KEY`, `NOTION_TOKEN`, `NOTION_INBOX_PAGE_ID`.
   (`GMAIL_REDIRECT_URI`, `GROQ_BASE_URL`, `GROQ_MODEL`, and `TZ` are hard-coded in the
   workflow's `env:`, so they don't need to be secrets.)
2. The workflow already lives at [`.github/workflows/daily.yml`](.github/workflows/daily.yml) —
   push to GitHub and it's active.
3. It runs on the workflow's cron (`30 23 * * *` UTC = 5:00 AM IST) and can also be
   triggered manually with **Run workflow** (`workflow_dispatch`).

The one-time `npm run authorize` browser consent still happens **locally** — CI only ever
uses the resulting `GMAIL_REFRESH_TOKEN`, so no redirect server or `localhost` is involved
in the scheduled job.

## Scope — what the app touches
- **Gmail:** read-only. It never marks messages read, labels, archives, or deletes.
- **Notion:** the only write is appending lines to the 📥 Inbox page. Nothing else is created or edited.
