import 'dotenv/config';

// Serper.dev — Google Search results API.
export async function webSearch(query, num = 5) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error('SERPER_API_KEY not configured');

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num }),
  });
  if (!res.ok) {
    throw new Error(`Serper ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return (data.organic || []).slice(0, num).map((it) => ({
    title: it.title,
    snippet: it.snippet,
    link: it.link,
  }));
}
