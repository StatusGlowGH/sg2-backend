export default async function handler(req, res) {
  const { code, shop, hmac, state } = req.query;

  if (!code || !shop) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    const tokenResponse = await fetch('https://' + shop + '/admin/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: code })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      return res.status(200).send(
        '<html><body style="font-family:monospace;padding:20px;background:#1a1a1a;color:#e0e0e0;">' +
        '<h2 style="color:#4ade80;">Token Retrieved!</h2>' +
        '<p>Copy this token and set it as <b>SHOPIFY_ADMIN_TOKEN</b> in Vercel environment variables:</p>' +
        '<pre style="background:#0d0d0d;padding:16px;border-radius:6px;word-break:break-all;font-size:14px;border:1px solid #333;">' + tokenData.access_token + '</pre>' +
        '<p style="color:#888;">Scopes: ' + tokenData.scope + '</p>' +
        '<p style="color:#888;">Shop: ' + shop + '</p>' +
        '</body></html>'
      );
    } else {
      return res.status(400).json({ error: 'Token exchange failed', details: tokenData });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', message: err.message });
  }
}
