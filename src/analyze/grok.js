import OpenAI from 'openai';
import 'dotenv/config';
import { SYSTEM_PROMPT, CONTEXT_PROMPT } from './prompts.js';

// Grok exposes an OpenAI-compatible Chat Completions API.
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || 'https://api.x.ai/v1',
});
const MODEL = process.env.GROQ_MODEL || 'grok-4';

async function chatJson(system, user) {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
  });
  return JSON.parse(res.choices[0].message.content);
}

export async function analyzeThreads(items) {
  const emails = items.map(({ threadId, subject, from, date, body }) => ({
    threadId,
    subject,
    from,
    date,
    body,
  }));
  const out = await chatJson(SYSTEM_PROMPT, {
    today: new Date().toISOString().slice(0, 10),
    emails,
  });
  return out.items || [];
}

// lookups: [{ threadId, query, results:[{title,snippet,link}] }] -> { [threadId]: "one line" }
export async function summarizeContext(lookups) {
  if (!lookups.length) return {};
  const out = await chatJson(CONTEXT_PROMPT, { lookups });
  return out.context || {};
}
