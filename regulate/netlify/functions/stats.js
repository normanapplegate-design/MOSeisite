import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!process.env.STATS_KEY || key !== process.env.STATS_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);
  const store = getStore('regulate-stats');
  const results = {};
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const data = await store.get(`day:${dayStr}`, { type: 'json' });
    if (data) results[dayStr] = data;
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/.netlify/functions/stats' };
