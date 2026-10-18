import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptIntegrationToken,
  type GoogleIntegrationId,
} from "@/lib/integrations/google-oauth";

/** Exchanges the stored refresh token for a fresh Google access token. */
export async function getGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
  provider: GoogleIntegrationId
) {
  const { data, error } = await supabase
    .from("integration_credentials")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data?.refresh_token_encrypted) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: decryptIntegrationToken(data.refresh_token_encrypted),
      grant_type: "refresh_token",
    }),
  });

  const json = await response.json();

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        "Google connection expired. Reconnect it in Integrations."
    );
  }

  return json.access_token as string;
}

function encodeHeader(value: string) {
  // RFC 2047 so accents and emojis display correctly.
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

/** Sends a plain-text email from the user's Gmail account. */
export async function sendGmail(
  accessToken: string,
  email: { to: string; subject: string; body: string; fromName?: string }
) {
  const raw = [
    `To: ${email.to}`,
    `Subject: ${encodeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(email.body, "utf8").toString("base64"),
  ].join("\r\n");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || "Gmail could not send the email.");
  }

  return json.id as string;
}
