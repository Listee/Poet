// POET — serverless verse engine.
// Keeps your Anthropic API key private on the server.
// Setup: in Netlify → Site configuration → Environment variables, add:
//   ANTHROPIC_API_KEY = sk-ant-...
// The front end posts {prompt} here and receives the raw Anthropic response.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST only' }) };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set in Netlify environment variables' }) };
  }
  let prompt;
  try {
    prompt = (JSON.parse(event.body || '{}').prompt || '').toString();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON body' }) };
  }
  if (!prompt || prompt.length > 8000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or oversized prompt' }) };
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000, // room for up to 22 couplets
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    return {
      statusCode: r.ok ? 200 : r.status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
