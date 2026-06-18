const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API = process.env.SHOPIFY_API_VERSION || '2024-10';

module.exports = async function handler(req, res) {
    const origins = (process.env.ALLOWED_ORIGINS || '').split(',');
    const origin = req.headers.origin;
    if (origins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { variantId, mockupUrl, logoUrl, design } = req.body || {};

    const price = design && design.total ? String(design.total) : '0.00';
    const title = design && design.text ? 'Custom Neon - ' + design.text : 'Custom Neon Sign';

    const productPayload = {
          product: {
                  title,
                  body_html: '',
                  vendor: 'StatusGlow',
                  product_type: 'Custom Neon',
                  tags: 'sg2-temp',
                  variants: [{ price, requires_shipping: true, taxable: true }]
          }
    };

    try {
          const r = await fetch(
                  'https://' + STORE + '/admin/api/' + API + '/products.json',
            {
                      method: 'POST',
                      headers: {
                                  'Content-Type': 'application/json',
                                  'X-Shopify-Access-Token': TOKEN
                      },
                      body: JSON.stringify(productPayload)
            }
                );

      if (!r.ok) {
              const err = await r.text();
              return res.status(r.status).json({ error: err });
      }

      const data = await r.json();
          const product = data.product;
          const variant = product.variants[0];

      return res.status(200).json({
              productId: product.id,
              variantId: variant.id,
              title: product.title,
              price: variant.price,
              mockupUrl: mockupUrl || null,
              logoUrl: logoUrl || null
      });
    } catch (e) {
          return res.status(500).json({ error: e.message });
    }
};
