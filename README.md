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
Put your Groq key (`gsk_…`) in `GROK_API_KEY`. Defaults: `GROK_BASE_URL=https://api.groq.com/openai/v1`,
`GROK_MODEL=llama-3.3-70b-versatile` (supports JSON mode). Override the model with `GROK_MODEL`.

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
npm run daily    # manual: run once now and exit
npm start        # scheduler: fires on CRON_SCHEDULE (default 08:00 daily)
```

While `npm start` is running you can also **trigger manually** without restarting —
type `run` (or `daily email`) and press Enter; type `quit` to exit. Manual and scheduled
runs can't overlap.

State (`data/state.json`) tracks the last run so each scan only covers new mail.

## Scope — what the app touches
- **Gmail:** read-only. It never marks messages read, labels, archives, or deletes.
- **Notion:** the only write is appending lines to the 📥 Inbox page. Nothing else is created or edited.
