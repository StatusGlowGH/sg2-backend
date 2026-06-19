/* sg2-backend — /api/send-logo
   Receives a base64 image data-URL from the Upload Logo modal,
   emails it as an attachment to the store inbox via Resend.

   Required env vars:
     RESEND_API_KEY   — from resend.com
     STORE_EMAIL      — inbox to receive logo quote requests (e.g. hello@statusglow.co)
     ALLOWED_ORIGINS  — comma-separated list of allowed origins (same as create-temp-product)
*/

const https = require("https");

const RESEND_KEY  = process.env.RESEND_API_KEY;
const STORE_EMAIL = process.env.STORE_EMAIL;
const ALLOWED     = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

function resendRequest(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED.length && !ALLOWED.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!RESEND_KEY || !STORE_EMAIL) {
    return res.status(500).json({ error: "Missing RESEND_API_KEY or STORE_EMAIL env var" });
  }

  const { name, email, src, dims, colours, notes } = req.body || {};

  if (!src || !src.startsWith("data:image/")) {
    return res.status(400).json({ error: "Only image files are accepted" });
  }

  const match = src.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: "Invalid image data URL" });
  const [, mimeType, base64Content] = match;
  const ext = mimeType.split("/")[1].replace(/\+.*$/, "");

  const html = `
    <h2>LED Neon — Logo Quote Request</h2>
    <p><strong>Name:</strong> ${name || "(not provided)"}</p>
    <p><strong>Email:</strong> ${email || "(not provided)"}</p>
    <p><strong>Approx. size:</strong> ${dims || "(not provided)"}</p>
    <p><strong>Preferred colour(s):</strong> ${colours || "(not provided)"}</p>
    <p><strong>Notes:</strong> ${notes || "(none)"}</p>
    <p>Logo file attached.</p>
  `;

  const result = await resendRequest({
    from: `Status Glow <hello@statusglow.co>`,
    to: [STORE_EMAIL],
    reply_to: email || undefined,
    subject: `Logo quote request${name ? " from " + name : ""}`,
    html,
    attachments: [{ filename: `logo.${ext}`, content: base64Content }],
  });

  if (result.status >= 400) {
    console.error("Resend error:", result.body);
    return res.status(502).json({ error: "Failed to send email" });
  }

  res.status(200).json({ ok: true });
};
