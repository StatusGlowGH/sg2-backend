// api/test-email.js — fire a sample order email for testing. DELETE after use.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const STORE_EMAIL = process.env.STORE_EMAIL || "hello@statusglow.co";

function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
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

export default async function handler(req, res) {
  const now = new Date().toISOString();
  const orderDate = new Date(now);

  const lastShipDate = addBusinessDays(orderDate, 5);
  const deliveryMin  = addBusinessDays(orderDate, 7);
  const deliveryMax  = addBusinessDays(orderDate, 10);

  const mockupUrl = "https://sg2-backend.vercel.app/placeholder-mockup.png";
  const adminUrl  = "https://admin.shopify.com/store/statusglowco/orders/TEST123";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.10); }
  .header { background: #1a1a1a; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: .02em; }
  .header p { color: rgba(255,255,255,.55); margin: 4px 0 0; font-size: 13px; }
  .section { padding: 24px 32px; border-bottom: 1px solid #f0f0f0; }
  .section:last-child { border-bottom: none; }
  .section h2 { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #f2087e; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 0; font-size: 14px; vertical-align: top; }
  td:first-child { color: #888; width: 38%; }
  td:last-child { color: #1a1a1a; font-weight: 600; }
  .ship-date { color: #e04800 !important; }
  .cta { display: inline-block; margin-top: 16px; background: #f2087e; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 700; font-size: 14px; letter-spacing: .04em; }
  .footer { padding: 20px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #aaa; }
  .test-banner { background: #fff3cd; border: 2px solid #f2087e; padding: 12px 24px; text-align: center; font-weight: 700; font-size: 13px; color: #f2087e; }
</style>
</head>
<body>
<div class="wrap">
  <div class="test-banner">⚡ TEST EMAIL — not a real order</div>
  <div class="header">
    <h1>New Order #1042</h1>
    <p>${fmtDateTime(now)}</p>
  </div>
  <div class="section">
    <h2>Design Details</h2>
    <table>
      <tr><td>Text</td><td>Status Glow / Neon Dreams</td></tr>
      <tr><td>Font</td><td>Pacifico</td></tr>
      <tr><td>Colour</td><td>Hot Pink</td></tr>
      <tr><td>Size</td><td>100cm × ~35cm</td></tr>
      <tr><td>Acrylic</td><td>Clear · White</td></tr>
      <tr><td>Alignment</td><td>Centre</td></tr>
      <tr><td>Power adaptor</td><td>AU Plug</td></tr>
    </table>
  </div>
  <div class="section">
    <h2>Add-ons</h2>
    <table>
      <tr><td colspan="2" style="color:#1a1a1a;font-weight:600;">✓ Wall Mounting</td></tr>
      <tr><td colspan="2" style="color:#1a1a1a;font-weight:600;">✓ Remote Dimmer</td></tr>
    </table>
  </div>
  <div class="section">
    <h2>Timeline</h2>
    <table>
      <tr><td>Order placed</td><td>${fmtDateTime(now)}</td></tr>
      <tr><td>Latest ship by</td><td class="ship-date">${fmtDate(lastShipDate)}</td></tr>
      <tr><td>Est. delivery</td><td>${fmtDate(deliveryMin)} – ${fmtDate(deliveryMax)}</td></tr>
    </table>
  </div>
  <div class="section">
    <h2>Customer</h2>
    <table>
      <tr><td>Name</td><td>Jane Test</td></tr>
      <tr><td>Email</td><td>jane@example.com</td></tr>
      <tr><td>Shipping to</td><td>12 Example St, Sydney, NSW, 2000, Australia</td></tr>
    </table>
    <a class="cta" href="${adminUrl}">View order in Shopify →</a>
  </div>
  <div class="footer">Status Glow · hello@statusglow.co</div>
</div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from:    "Status Glow <hello@statusglow.co>",
      to:      STORE_EMAIL,
      subject: `[TEST] New Order #1042 — Status Glow / Neon Dreams (100cm)`,
      html
    });
    return res.status(200).json({ ok: true, sent_to: STORE_EMAIL });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
