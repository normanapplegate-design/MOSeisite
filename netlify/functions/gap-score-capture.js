// netlify/functions/gap-score-capture.js
//
// Receives { email, dimension, score } from the Gap Score tool (client-side fetch),
// and creates/updates a subscriber in Kit (ConvertKit) with the "Gap Dimension"
// custom field set. The Kit API key stays server-side via process.env.KIT_API_KEY --
// it is never exposed to the browser.

const https = require('https');

const KIT_API_BASE = 'api.kit.com';
const FORM_ID = '9696473'; // "Gap Score Capture" form

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { email, dimension, score } = payload;

  if (!email || typeof email !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing or invalid email' }),
    };
  }

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('KIT_API_KEY is not set in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    };
  }

  function kitPost(path, bodyObj) {
    const body = JSON.stringify(bodyObj);
    const options = {
      hostname: KIT_API_BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': apiKey,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  try {
    const subscriberResponse = await kitPost('/v4/subscribers', {
      email_address: email,
      state: 'active',
      fields: {
        gap_dimension: dimension || '',
        ...(score !== undefined ? { gap_score: String(score) } : {}),
      },
    });

    if (subscriberResponse.statusCode < 200 || subscriberResponse.statusCode >= 300) {
      console.error(
        'Kit create-subscriber error:',
        subscriberResponse.statusCode,
        subscriberResponse.body
      );
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Kit API request failed (create subscriber)',
          details: subscriberResponse.body,
        }),
      };
    }

    const formResponse = await kitPost(`/v4/forms/${FORM_ID}/subscribers`, {
      email_address: email,
    });

    if (formResponse.statusCode < 200 || formResponse.statusCode >= 300) {
      console.error('Kit add-to-form error:', formResponse.statusCode, formResponse.body);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          warning: 'Subscriber created but form attribution failed',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Request to Kit failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
