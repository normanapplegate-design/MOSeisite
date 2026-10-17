// Streaming version of the MOSei Advisor, used by ask.html.
// Same prompt, KPI library and situation matching as advisor.js; the difference is that
// the answer is sent to the browser word by word as it is written, instead of all at once.
import advisor from './advisor.js';

const { MODELS, buildSystemPrompt } = advisor;

function callAnthropic(model, system, messages) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages, stream: true })
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Bad request', { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const question = messages.filter(m => m.role === 'user').map(m => m.content).pop() || '';
  if (!question) {
    return new Response('No question', { status: 400 });
  }

  const system = buildSystemPrompt(question);

  let upstream = null;
  for (const model of MODELS) {
    const res = await callAnthropic(model, system, messages);
    if (res.ok && res.body) {
      upstream = res;
      break;
    }
    console.error('Model ' + model + ' failed:', res.status, (await res.text()).substring(0, 300));
  }
  if (!upstream) {
    return new Response('Advisor unavailable', { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            let event;
            try { event = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
            if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.type === 'error') {
              console.error('Stream error:', JSON.stringify(event).substring(0, 300));
              controller.enqueue(encoder.encode('\n\n[The answer was cut off. Please ask again.]'));
            }
          }
        }
      } catch (e) {
        console.error('Stream read failed:', e.message);
        controller.enqueue(encoder.encode('\n\n[The answer was cut off. Please ask again.]'));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    }
  });
};
