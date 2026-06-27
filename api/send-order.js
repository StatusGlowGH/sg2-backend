// api/send-order.js
// Shopify orders/create webhook → send fulfilment email via Resend
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const STORE_EMAIL  = process.env.STORE_EMAIL  || "hello@statusglow.co";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "";
const SHOPIFY_STORE = "statusglowco";

/* ── Verify Shopify HMAC ─────────────────────────────────────────── */
function verifyHmac(rawBody, hmacHeader) {
  if (!WEBHOOK_SECRET) return true; // skip in dev
  const digest = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader || ""));
}

/* ── Business-day arithmetic ─────────────────────────────────────── */
function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip Sat/Sun
  }
  return d;
}

function fmtDate(date) {
  return date.toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
    timeZone: "Australia/Sydney"
  });
}

function fmtDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Australia/Sydney"
  }) + " AEST";
}

/* ── Property helpers ────────────────────────────────────────────── */
function getProp(properties, name) {
  const p = (properties || []).find(x => x.name === name);
  return p ? p.value : "";
}

/* ── Email HTML ──────────────────────────────────────────────────── */
function buildHtml({ order, item, props, mockupUrl, orderDateTime, lastShipDate, deliveryRange, adminUrl }) {
  const addons  = getProp(props, "Add-ons");
  const hasAddons = addons && addons !== "None";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.10); }
  .header { background: #1a1a1a; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: .02em; }
  .header p { color: rgba(255,255,255,.55); margin: 4px 0 0; font-size: 13px; }
  .mockup { background: #0d0d0d; text-align: center; padding: 24px 0; }
  .mockup img { max-width: 100%; max-height: 280px; border-radius: 10px; }
  .section { padding: 24px 32px; border-bottom: 1px solid #f0f0f0; }
  .section:last-child { border-bottom: none; }
  .section h2 { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #f2087e; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 0; font-size: 14px; vertical-align: top; }
  td:first-child { color: #888; width: 38%; }
  td:last-child { color: #1a1a1a; font-weight: 600; }
  .dates td:last-child { color: #1a1a1a; }
  .ship-date { color: #e04800 !important; }
  .cta { display: inline-block; margin-top: 16px; background: #f2087e; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 700; font-size: 14px; letter-spacing: .04em; }
  .footer { padding: 20px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #aaa; }
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="header">
    <h1>New Order #${order.order_number}</h1>
    <p>${orderDateTime}</p>
  </div>

  ${mockupUrl ? `
  <!-- Mockup -->
  <div class="mockup">
    <img src="${mockupUrl}" alt="Neon sign mockup" />
  </div>` : ""}

  <!-- Design Details -->
  <div class="section">
    <h2>Design Details</h2>
    <table>
      <tr><td>Text</td><td>${getProp(props, "Text") || "—"}</td></tr>
      <tr><td>Font</td><td>${getProp(props, "Font") || "—"}</td></tr>
      <tr><td>Colour</td><td>${getProp(props, "Colour") || "—"}</td></tr>
      <tr><td>Size</td><td>${getProp(props, "Size") || "—"}</td></tr>
      <tr><td>Acrylic</td><td>${getProp(props, "Acrylic") || "—"}</td></tr>
      <tr><td>Alignment</td><td>${getProp(props, "Alignment") || "—"}</td></tr>
      <tr><td>Power adaptor</td><td>${getProp(props, "Power adaptor") || "—"}</td></tr>
    </table>
  </div>

  ${hasAddons ? `
  <!-- Add-ons -->
  <div class="section">
    <h2>Add-ons</h2>
    <table>
      ${addons.split(", ").map(a => `<tr><td colspan="2" style="color:#1a1a1a;font-weight:600;">✓ ${a}</td></tr>`).join("")}
    </table>
  </div>` : ""}

  <!-- Dates -->
  <div class="section dates">
    <h2>Timeline</h2>
    <table>
      <tr><td>Order placed</td><td>${orderDateTime}</td></tr>
      <tr><td>Latest ship by</td><td class="ship-date">${lastShipDate}</td></tr>
      <tr><td>Est. delivery</td><td>${deliveryRange}</td></tr>
    </table>
  </div>

  <!-- Customer -->
  <div class="section">
    <h2>Customer</h2>
    <table>
      <tr><td>Name</td><td>${order.customer ? (order.customer.first_name + " " + order.customer.last_name) : "—"}</td></tr>
      <tr><td>Email</td><td>${order.customer ? order.customer.email : "—"}</td></tr>
      <tr><td>Shipping to</td><td>${order.shipping_address ? [
        order.shipping_address.address1,
        order.shipping_address.address2,
        order.shipping_address.city,
        order.shipping_address.province,
        order.shipping_address.zip,
        order.shipping_address.country
      ].filter(Boolean).join(", ") : "—"}</td></tr>
    </table>
    <a class="cta" href="${adminUrl}">View order in Shopify →</a>
  </div>

  <div class="footer">Status Glow · hello@statusglow.co</div>
</div>
</body>
</html>`;
}

/* ── Main handler ────────────────────────────────────────────────── */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  const hmac = req.headers["x-shopify-hmac-sha256"] || "";
  if (!verifyHmac(rawBody, hmac)) {
    return res.status(401).json({ error: "Invalid HMAC" });
  }

  let order;
  try { order = JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const item = order.line_items?.find(li =>
    li.properties?.some(p => p.name === "_mockup_url")
  );
  if (!item) {
    return res.status(200).json({ skipped: true });
  }

  const props      = item.properties || [];
  const mockupUrl  = getProp(props, "_mockup_url");
  const isRush     = getProp(props, "_rush") === "true";
  const orderDate  = new Date(order.created_at);

  const lastShipDays     = isRush ? 2  : 5;
  const deliveryMinDays  = isRush ? 5  : 7;
  const deliveryMaxDays  = isRush ? 7  : 10;

  const lastShipDate  = isRush
    ? new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000)
    : addBusinessDays(orderDate, lastShipDays);
  const deliveryMin   = addBusinessDays(orderDate, deliveryMinDays);
  const deliveryMax   = addBusinessDays(orderDate, deliveryMaxDays);

  const adminUrl = `https://admin.shopify.com/store/${SHOPIFY_STORE}/orders/${order.id}`;

  const html = buildHtml({
    order, item, props, mockupUrl,
    orderDateTime: fmtDateTime(order.created_at),
    lastShipDate:  fmtDate(lastShipDate),
    deliveryRange: `${fmtDate(deliveryMin)} – ${fmtDate(deliveryMax)}`,
    adminUrl
  });

  try {
    await resend.emails.send({
      from:    "Status Glow <hello@statusglow.co>",
      to:      STORE_EMAIL,
      subject: `New Order #${order.order_number} — ${getProp(props, "Text") || item.title} (${getProp(props, "Size") || ""})`,
      html
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send-order email error:", err);
    return res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: false } };
