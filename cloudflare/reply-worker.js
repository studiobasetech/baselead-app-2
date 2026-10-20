/**
 * BaseLead reply tracker — Cloudflare Email Worker (free plan).
 *
 * Setup (see SETUP-BASELEAD.md section 15):
 *  1. Cloudflare → your domain → Email → Email Routing → enable.
 *  2. Workers & Pages → Create → "Hello World" worker → paste this file → Deploy.
 *  3. Worker → Settings → Variables: BASELEAD_URL = https://your-app-domain
 *                                    INBOUND_EMAIL_SECRET = (same value as in .env)
 *  4. Email Routing → Routing rules → Catch-all (or custom "r+*") → Send to Worker → this worker.
 *
 * The rep already receives the reply in their own inbox (they are the first
 * Reply-To address). This worker only tells BaseLead the lead replied.
 */
export default {
  async email(message, env) {
    const raw = await new Response(message.raw).text();
    const text = extractPlainText(raw).slice(0, 4000);

    await fetch(`${env.BASELEAD_URL.replace(/\/$/, "")}/api/inbound/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-inbound-secret": env.INBOUND_EMAIL_SECRET,
      },
      body: JSON.stringify({
        to: message.to,
        from: message.headers.get("from") || message.from,
        subject: message.headers.get("subject") || "",
        text,
      }),
    });
  },
};

function extractPlainText(raw) {
  const boundaryMatch = raw.match(/boundary="?([^";\r\n]+)"?/i);
  let parts = [raw];
  if (boundaryMatch) parts = raw.split(`--${boundaryMatch[1]}`);

  // Nested multipart (alternative inside mixed)
  const expanded = [];
  for (const part of parts) {
    const inner = part.match(/boundary="?([^";\r\n]+)"?/i);
    if (inner && part !== raw) expanded.push(...part.split(`--${inner[1]}`));
    else expanded.push(part);
  }

  const plain = expanded.find((part) => /content-type:\s*text\/plain/i.test(part)) || expanded[expanded.length - 1] || raw;
  const split = plain.search(/\r?\n\r?\n/);
  const headers = split > -1 ? plain.slice(0, split) : "";
  let body = split > -1 ? plain.slice(split).trim() : plain;

  if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    try {
      body = new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\s+/g, "")), (c) => c.charCodeAt(0)));
    } catch {}
  } else if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    body = body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  if (/content-type:\s*text\/html/i.test(headers)) body = body.replace(/<[^>]+>/g, " ");
  return body;
}
