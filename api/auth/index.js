export default function handler(req, res) {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = process.env.APP_URL + '/api/auth/callback';
  const scopes = 'write_products,read_products';
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl =
    'https://' + shop +
    '/admin/oauth/authorize?client_id=' + clientId +
    '&scope=' + scopes +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&state=' + state;

  res.redirect(302, authUrl);
}
