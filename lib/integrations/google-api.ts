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

/**
 * Sends a plain-text email from the user's Gmail account.
 * Pass threadId to send a follow-up in the same conversation.
 */
export async function sendGmail(
  accessToken: string,
  email: {
    to: string;
    subject: string;
    body: string;
    threadId?: string | null;
    inReplyTo?: string | null;
    headers?: string[];
  }
): Promise<{ id: string; threadId: string }> {
  const headers = [
    `To: ${email.to}`,
    `Subject: ${encodeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];

  if (email.headers?.length) {
    headers.push(...email.headers);
  }

  if (email.inReplyTo) {
    headers.push(`In-Reply-To: ${email.inReplyTo}`, `References: ${email.inReplyTo}`);
  }

  const raw = [...headers, "", Buffer.from(email.body, "utf8").toString("base64")].join("\r\n");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: Buffer.from(raw).toString("base64url"),
        ...(email.threadId ? { threadId: email.threadId } : {}),
      }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || "Gmail could not send the email.");
  }

  return { id: json.id as string, threadId: json.threadId as string };
}

type GmailMessage = {
  id: string;
  labelIds?: string[];
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

/**
 * Returns the first message in a thread that was NOT sent by us
 * (i.e. the prospect replied), or null. Needs gmail.readonly.
 */
export async function findReplyInThread(accessToken: string, threadId: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Message-ID&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (response.status === 403) {
    throw new Error("Reconnect Gmail in Integrations to allow reply detection.");
  }

  if (!response.ok) return null;

  const json = (await response.json()) as { messages?: GmailMessage[] };
  const reply = (json.messages ?? []).find(
    (message) => !(message.labelIds ?? []).includes("SENT")
  );

  if (!reply) return null;

  const header = (name: string) =>
    reply.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: reply.id,
    from: header("From"),
    messageId: header("Message-ID"),
    snippet: reply.snippet ?? "",
    receivedAt: reply.internalDate
      ? new Date(Number(reply.internalDate)).toISOString()
      : new Date().toISOString(),
  };
}

/** Busy time ranges from Google Calendar (for booking pages). */
export async function getGoogleBusy(
  accessToken: string,
  fromIso: string,
  toIso: string
): Promise<{ start: string; end: string }[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: fromIso, timeMax: toIso, items: [{ id: "primary" }] }),
  });

  if (!response.ok) return [];

  const json = await response.json();
  return json?.calendars?.primary?.busy ?? [];
}

/** Creates a Google Calendar event with a Google Meet link and invites the guest. */
export async function createGoogleMeeting(
  accessToken: string,
  event: {
    title: string;
    description?: string;
    start: string;
    end: string;
    guestEmail: string;
    guestName?: string;
  }
) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
        attendees: [{ email: event.guestEmail, displayName: event.guestName }],
        conferenceData: {
          createRequest: { requestId: `bl-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
        reminders: { useDefault: true },
      }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || "Google Calendar could not create the meeting.");
  }

  return {
    id: json.id as string,
    meetUrl: (json.hangoutLink as string | undefined) ?? null,
  };
}
