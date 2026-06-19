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

        const { mockupDataUrl, design } = req.body || {};

        const price = design && design.total ? String(design.total) : '0.00';
        const title = design && design.text ? 'Custom Neon - ' + design.text : 'Custom Neon Sign';

        // Build design spec HTML description
        const d = design || {};
        const sizeStr = d.size
            ? (d.size.widthCm + 'cm x ~' + d.size.heightCm + 'cm' + (d.size.custom ? ' (custom)' : ''))
                    : '';
        const rows = [
                    d.text   && ['Text',          d.text.replace(/\n/g, ' / ')],
                    d.font   && ['Font',          d.font.name || d.font],
                    d.colour && ['Colour',        d.colour.name || d.colour],
                    sizeStr  && ['Size',          sizeStr],
                    d.board  && ['Acrylic',       d.board + (d.boardColour ? ' - ' + d.boardColour : '')],
                    d.power  && ['Power Adaptor', d.power],
                ].filter(Boolean);
        const body_html = '<strong>Custom Neon Sign Specifications</strong><ul>' +
                    rows.map(function(r) { return '<li><strong>' + r[0] + ':</strong> ' + r[1] + '</li>'; }).join('') +
                    '</ul>';

        const productPayload = {
                    product: {
                                    title,
                                    body_html,
                                    vendor: 'StatusGlow',
                                    product_type: 'Custom Neon',
                                    tags: 'sg2-temp',
                                    variants: [{ price, requires_shipping: true, taxable: true }]
                    }
        };

        // Attach mockup image as base64
        if (mockupDataUrl && mockupDataUrl.startsWith('data:')) {
                    const base64 = mockupDataUrl.split(',')[1];
                    productPayload.product.images = [{ attachment: base64, filename: 'mockup.png' }];
        }

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
                    const image = product.images && product.images[0];

            return res.status(200).json({
                            productId: product.id,
                            variantId: variant.id,
                            title: product.title,
                            price: variant.price,
                            mockupUrl: image ? image.src : null,
                            logoUrl: null
            });
        } catch (e) {
                    return res.status(500).json({ error: e.message });
        }
};
