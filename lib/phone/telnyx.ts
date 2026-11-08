import { createPublicKey, verify } from "node:crypto";

/*
 * Telnyx (built-in calling). One Telnyx account — BaseLead's — serves every
 * customer. Keys live only in .env.local:
 *   TELNYX_API_KEY                 API key (Telnyx portal → Auth)
 *   TELNYX_PUBLIC_KEY              webhook signing public key (Telnyx portal → Auth → Public key)
 *   TELNYX_CREDENTIAL_CONNECTION_ID  the WebRTC/SIP credential connection reps call through
 *   TELNYX_CALL_CONTROL_APP_ID     the Call Control application the numbers ring into
 */

const API = "https://api.telnyx.com/v2";

export function isTelnyxConfigured() {
  return Boolean(
    process.env.TELNYX_API_KEY &&
      process.env.TELNYX_CREDENTIAL_CONNECTION_ID &&
      process.env.TELNYX_CALL_CONTROL_APP_ID
  );
}

export async function telnyx<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("TELNYX_API_KEY is not configured.");

  const response = await fetch(`${API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Token endpoint returns plain text.
    if (response.ok) return text as unknown as T;
  }

  if (!response.ok) {
    const errors = (json.errors as { detail?: string; title?: string }[] | undefined) ?? [];
    throw new Error(errors[0]?.detail || errors[0]?.title || `Telnyx request failed (${response.status}).`);
  }

  return json as T;
}

/* ---------------- Webhook signature (ed25519) ---------------- */

export function verifyTelnyxSignature(rawBody: string, signature: string | null, timestamp: string | null) {
  const publicKey = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKey) return false;
  if (!signature || !timestamp) return false;

  // Reject events older than 5 minutes (replays).
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  try {
    const raw = Buffer.from(publicKey, "base64");
    const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]);
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    return verify(null, Buffer.from(`${timestamp}|${rawBody}`), key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

/* ---------------- Numbers ---------------- */

export type AvailableNumber = { phone_number: string; locality?: string; region?: string };

export async function searchNumbers(options: { areaCode?: string; country?: "US" | "CA"; limit?: number }) {
  const params = new URLSearchParams();
  params.set("filter[country_code]", options.country ?? "US");
  params.set("filter[phone_number_type]", "local");
  params.append("filter[features][]", "voice");
  params.set("filter[limit]", String(options.limit ?? 6));
  if (options.areaCode) params.set("filter[national_destination_code]", options.areaCode);

  const result = await telnyx<{ data: { phone_number: string; region_information?: { region_type: string; region_name: string }[] }[] }>(
    "GET",
    `available_phone_numbers?${params.toString()}`
  );

  return (result.data ?? []).map((item): AvailableNumber => ({
    phone_number: item.phone_number,
    locality: item.region_information?.find((r) => r.region_type === "rate_center")?.region_name,
    region: item.region_information?.find((r) => r.region_type === "state")?.region_name,
  }));
}

/** Buys a number and points it at the Call Control app (so inbound calls reach the app). */
export async function orderNumber(phoneNumber: string, customerReference: string) {
  const order = await telnyx<{ data: { id: string; phone_numbers?: { id: string; phone_number: string }[] } }>(
    "POST",
    "number_orders",
    {
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: process.env.TELNYX_CALL_CONTROL_APP_ID,
      customer_reference: customerReference,
    }
  );
  return order.data;
}

export async function releaseNumber(telnyxNumberId: string) {
  await telnyx("DELETE", `phone_numbers/${telnyxNumberId}`);
}

/* ---------------- Rep calling logins (WebRTC) ---------------- */

export async function createCredential(name: string, tag: string) {
  const result = await telnyx<{ data: { id: string; sip_username: string } }>("POST", "telephony_credentials", {
    connection_id: process.env.TELNYX_CREDENTIAL_CONNECTION_ID,
    name,
    tag,
  });
  return result.data;
}

/** Short-lived login token for the in-app phone. */
export async function credentialToken(credentialId: string) {
  return telnyx<string>("POST", `telephony_credentials/${credentialId}/token`);
}

/* ---------------- Call Control ---------------- */

export async function callAction(callControlId: string, action: string, body: Record<string, unknown> = {}) {
  return telnyx("POST", `calls/${encodeURIComponent(callControlId)}/actions/${action}`, body);
}

export async function recordingDownloadUrl(recordingId: string) {
  const result = await telnyx<{ data: { download_urls?: { mp3?: string; wav?: string } } }>(
    "GET",
    `recordings/${recordingId}`
  );
  return result.data?.download_urls?.mp3 || result.data?.download_urls?.wav || null;
}

/* ---------------- Helpers ---------------- */

const CARIBBEAN_AREA_CODES = new Set([
  "242", "246", "264", "268", "284", "345", "441", "473", "649", "658", "664",
  "721", "758", "767", "784", "809", "829", "849", "868", "869", "876",
]);

/** E.164 for USA/Canada (+1). Returns null for anything else. */
export function toNorthAmerican(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  // Area code and exchange can't start with 0/1; block premium 900 and 976 lines.
  if (/^[01]/.test(ten) || /^[01]/.test(ten.slice(3))) return null;
  if (ten.startsWith("900") || ten.slice(3, 6) === "976") return null;
  // +1 Caribbean and Atlantic countries are international (and a fraud target): blocked.
  if (CARIBBEAN_AREA_CODES.has(ten.slice(0, 3))) return null;
  return `+1${ten}`;
}

export function lastTen(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(-10);
}
