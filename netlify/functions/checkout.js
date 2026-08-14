// POET — Stripe checkout for balloon purchases (optional, for when you go live).
//
// IMPORTANT HONESTY NOTE:
// Card processors enforce a minimum charge — Stripe's is $0.50 USD.
// Single charges of 9–16 cents will be REJECTED below, by design.
// Ways to keep your 9–16¢ balloons AND real money:
//   1) Sell bundles: e.g. "5 balloons for 60¢" (pass amount >= 50).
//   2) A credits wallet: one top-up of $1+, then spend 9–16¢ per balloon
//      from the balance (needs a small database + accounts — happy to build).
//
// Setup: in Netlify env vars, add STRIPE_SECRET_KEY = sk_live_... (or sk_test_...)
// Then in index.html set PAY_MODE='stripe'.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST only' }) };
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set' }) };
  }
  let amount;
  try {
    amount = parseInt(JSON.parse(event.body || '{}').amount, 10);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON body' }) };
  }
  if (!amount || amount < 1 || amount > 10000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad amount' }) };
  }
  if (amount < 50) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Card networks require a minimum of 50\u00A2 — see notes in checkout.js for bundle/wallet options.' })
    };
  }
  const origin = (event.headers && (event.headers.origin || ('https://' + event.headers.host))) || '';
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', origin + '/?poet_paid=1');
  form.set('cancel_url', origin + '/');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', 'One POET balloon');
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + key,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await r.json();
    if (!r.ok) {
      return { statusCode: r.status, body: JSON.stringify({ error: (data.error && data.error.message) || 'Stripe error' }) };
    }
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: data.url })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
