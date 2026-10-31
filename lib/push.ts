import { createSign, sign as cryptoSign } from "node:crypto";
import { connect } from "node:http2";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Push notifications to the phone apps (free):
 * - Android: Firebase Cloud Messaging. Needs FIREBASE_SERVICE_ACCOUNT (service-account JSON from
 *   Firebase → Project settings → Service accounts; raw JSON or base64).
 * - iPhone: Apple Push Notification service directly. Needs APNS_KEY (the .p8 key text),
 *   APNS_KEY_ID, APNS_TEAM_ID, and optionally APNS_BUNDLE_ID / APNS_PRODUCTION=true.
 * Anything not configured is skipped quietly.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedToken: { value: string; expires: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return json.project_id && json.client_email && json.private_key ? json : null;
  } catch {
    return null;
  }
}

export const isPushConfigured = () => Boolean(serviceAccount() || apnsConfig());

function apnsConfig() {
  const key = process.env.APNS_KEY?.replace(/\\n/g, "\n");
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;
  return {
    key,
    keyId,
    teamId,
    bundleId: process.env.APNS_BUNDLE_ID || "com.studiobase.baselead",
    host: process.env.APNS_PRODUCTION === "true" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com",
  };
}

let apnsJwt: { value: string; issued: number } | null = null;

function apnsToken(cfg: NonNullable<ReturnType<typeof apnsConfig>>) {
  if (apnsJwt && Date.now() - apnsJwt.issued < 45 * 60_000) return apnsJwt.value;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(Date.now() / 1000) }));
  const signature = cryptoSign("sha256", Buffer.from(`${header}.${claims}`), { key: cfg.key, dsaEncoding: "ieee-p1363" });
  apnsJwt = { value: `${header}.${claims}.${b64url(signature)}`, issued: Date.now() };
  return apnsJwt.value;
}

function sendApns(cfg: NonNullable<ReturnType<typeof apnsConfig>>, token: string, message: { title: string; body: string; url?: string }) {
  return new Promise<number>((resolve) => {
    const client = connect(cfg.host);
    client.on("error", () => resolve(0));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${apnsToken(cfg)}`,
      "apns-topic": cfg.bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });
    req.on("response", (headers) => {
      resolve(Number(headers[":status"]) || 0);
      client.close();
    });
    req.on("error", () => { resolve(0); client.close(); });
    req.end(JSON.stringify({ aps: { alert: { title: message.title, body: message.body }, sound: "default" }, url: message.url }));
  });
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

async function accessToken(sa: ServiceAccount) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key.replace(/\\n/g, "\n")))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Firebase auth failed");
  cachedToken = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

/** Sends a push to every phone the user is signed in on. Never throws. */
export async function sendPush(
  admin: SupabaseClient,
  userId: string,
  message: { title: string; body: string; url?: string }
): Promise<number> {
  const sa = serviceAccount();
  const apns = apnsConfig();
  if (!sa && !apns) return 0;
  try {
    const { data: tokens } = await admin.from("push_tokens").select("token, platform").eq("user_id", userId);
    if (!tokens?.length) return 0;
    let sent = 0;
    for (const { token, platform } of tokens as { token: string; platform: string }[]) {
      if (platform === "ios" && apns) {
        const status = await sendApns(apns, token, message);
        if (status === 200) sent++;
        else if (status === 400 || status === 410) await admin.from("push_tokens").delete().eq("token", token);
        continue;
      }
      if (platform === "android" && sa) {
        const auth = await accessToken(sa);
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.url ? { url: message.url } : {},
            },
          }),
        });
        if (res.ok) sent++;
        else if (res.status === 404 || res.status === 400) await admin.from("push_tokens").delete().eq("token", token);
      }
    }
    return sent;
  } catch (error) {
    console.error("Push failed:", error);
    return 0;
  }
}
