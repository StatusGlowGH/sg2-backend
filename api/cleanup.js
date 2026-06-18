const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API = process.env.SHOPIFY_API_VERSION || '2024-10';
const TTL_HOURS = parseInt(process.env.TEMP_TTL_HOURS || '48', 10);
const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async function handler(req, res) {
  const auth = req.headers.authorization;
  if (auth !== 'Bearer ' + CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

  try {
    const r = await fetch(
      'https://' + STORE + '/admin/api/' + API + '/products.json?tag=sg2-temp&limit=250&fields=id,created_at',
      { headers: { 'X-Shopify-Access-Token': TOKEN } }
    );
    const data = await r.json();
    const products = data.products || [];
    const toDelete = products.filter(function(p) { return p.created_at < cutoff; });
    var deleted = 0;

    for (var i = 0; i < toDelete.length; i++) {
      var p = toDelete[i];
      var del = await fetch(
        'https://' + STORE + '/admin/api/' + API + '/products/' + p.id + '.json',
        { method: 'DELETE', headers: { 'X-Shopify-Access-Token': TOKEN } }
      );
      if (del.status === 200 || del.status === 204) deleted++;
    }

    return res.status(200).json({ checked: products.length, deleted: deleted, cutoff: cutoff });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
