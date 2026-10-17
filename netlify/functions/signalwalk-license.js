// netlify/functions/signalwalk-license.js
//
// Checks a SignalWalk license key with Gumroad. The browser cannot call the
// Gumroad API directly, so the app posts { license_key, activate } here.
//
// Netlify environment variables:
//   SIGNALWALK_PRODUCT_ID   Gumroad product ID (Product > Content > License key). Required for
//                           products created after January 2023. If it is not set, the
//                           permalink below is sent instead.
//   SIGNALWALK_COMP_KEYS    Optional. Comma-separated keys you hand out free (your own phone,
//                           a colleague). They unlock without a Gumroad purchase.
//   SIGNALWALK_MAX_DEVICES  Optional. Devices one purchase can unlock. Default 3.

const https = require('https');

const PRODUCT_PERMALINK = 'signalwalk';

function gumroadVerify(params) {
  const body = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.gumroad.com',
      path: '/v2/licenses/verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

const reply = (statusCode, obj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, reason: 'method' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, reason: 'bad_request' }); }

  const key = String(payload.license_key || '').trim();
  if (!key || key.length > 100) return reply(200, { ok: false, reason: 'invalid' });

  const comp = String(process.env.SIGNALWALK_COMP_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (comp.includes(key)) return reply(200, { ok: true, comp: true });

  const params = { license_key: key, increment_uses_count: payload.activate ? 'true' : 'false' };
  if (process.env.SIGNALWALK_PRODUCT_ID) params.product_id = process.env.SIGNALWALK_PRODUCT_ID;
  else params.product_permalink = PRODUCT_PERMALINK;

  let result;
  try { result = await gumroadVerify(params); } catch (e) { return reply(502, { ok: false, reason: 'unreachable' }); }

  const j = result.json;
  if (!j || !j.success || !j.purchase) return reply(200, { ok: false, reason: 'invalid' });

  const p = j.purchase;
  if (p.refunded || p.chargebacked || p.disputed) return reply(200, { ok: false, reason: 'refunded' });
  if (p.subscription_cancelled_at || p.subscription_failed_at) return reply(200, { ok: false, reason: 'inactive' });

  const maxDevices = parseInt(process.env.SIGNALWALK_MAX_DEVICES || '3', 10);
  if (payload.activate && typeof j.uses === 'number' && j.uses > maxDevices) {
    return reply(200, { ok: false, reason: 'device_limit', max: maxDevices });
  }

  return reply(200, { ok: true });
};
