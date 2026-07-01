import { getStore } from '@netlify/blobs';

const ALLOWED_EVENTS = [
  'page_view',
  'app_open_standalone',
  'session_start',
  'just_breathe',
  'go_deeper',
  'breath_only_complete',
  'full_session_complete'
];

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const event = ALLOWED_EVENTS.includes(body.event) ? body.event : null;

    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: 'unknown event' }), { status: 400 });
    }

    const store = getStore('regulate-stats');
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `day:${day}`;

    const existing = (await store.get(key, { type: 'json' })) || {};
    existing[event] = (existing[event] || 0) + 1;
    await store.setJSON(key, existing);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

export const config = { path: '/.netlify/functions/track' };
