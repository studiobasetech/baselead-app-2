import { createHmac, timingSafeEqual } from "node:crypto";
import { getWorkspaceSecret } from "@/lib/workspace-secrets";

/* Each workspace connects its own Twilio account (they pay their own SMS). */

export type TwilioCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export async function getTwilio(companyId: string): Promise<TwilioCredentials | null> {
  const stored = await getWorkspaceSecret(companyId, "twilio").catch(() => null);
  if (!stored) return null;

  try {
    return JSON.parse(stored.secret) as TwilioCredentials;
  } catch {
    return null;
  }
}

/** E.164-ish cleanup: keeps + and digits; assumes US (+1) for 10 digits. */
export function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export async function sendSms(credentials: TwilioCredentials, to: string, body: string) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: credentials.fromNumber, Body: body }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.message || "Twilio could not send the SMS.");
  }

  return json.sid as string;
}

export async function verifyTwilioAccount(credentials: TwilioCredentials) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
      },
    }
  );

  if (!response.ok) throw new Error("Twilio rejected those credentials.");

  const json = await response.json();
  return (json.friendly_name as string) || credentials.accountSid;
}

/** Validates the X-Twilio-Signature header of an incoming webhook. */
export function validTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null
) {
  if (!signature) return false;

  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  return a.length === b.length && timingSafeEqual(a, b);
}
